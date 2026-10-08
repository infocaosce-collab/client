import { switchToDarkMode, switchToLightMode, switchToAutoMode, getCurrentThemeMode } from "./themeMode";
// Helper function to create a mutable MediaQueryList mock.
function createMediaQueryList(initialMatches, query = "(prefers-color-scheme: dark)") {
    let currentMatches = initialMatches;
    const mql = {
        get matches() {
            return currentMatches;
        },
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
    };
    return Object.assign(mql, {
        setMatches(newMatches) {
            currentMatches = newMatches;
        },
    });
}
describe("themeMode helper", () => {
    let originalMatchMedia;
    beforeAll(() => {
        originalMatchMedia = window.matchMedia;
    });
    afterAll(() => {
        window.matchMedia = originalMatchMedia;
    });
    beforeEach(() => {
        // Clear theme classes and reset auto mode before each test.
        document.body.className = "";
    });
    it("should add the 'dark' class when switching to dark mode", () => {
        switchToDarkMode();
        expect(document.body.classList.contains("dark")).toBeTrue();
    });
    it("should remove the 'dark' class when switching to light mode", () => {
        document.body.classList.add("dark");
        switchToLightMode();
        expect(document.body.classList.contains("dark")).toBeFalse();
    });
    it("should apply dark mode automatically when user prefers dark", () => {
        window.matchMedia = (query) => createMediaQueryList(true, query);
        switchToAutoMode();
        expect(document.body.classList.contains("dark")).toBeTrue();
    });
    it("should apply light mode automatically when user does not prefer dark", () => {
        document.body.classList.add("dark");
        window.matchMedia = (query) => createMediaQueryList(false, query);
        switchToAutoMode();
        expect(document.body.classList.contains("dark")).toBeFalse();
    });
    it("should update theme when system preference changes in auto mode upon re-calling switchToAutoMode", () => {
        // Initially simulate light preference.
        window.matchMedia = (query) => createMediaQueryList(false, query);
        switchToAutoMode();
        expect(document.body.classList.contains("dark")).toBeFalse();
        // Simulate dark preference by returning a new media query object.
        window.matchMedia = (query) => createMediaQueryList(true, query);
        switchToAutoMode();
        expect(document.body.classList.contains("dark")).toBeTrue();
        // Change back to light preference.
        window.matchMedia = (query) => createMediaQueryList(false, query);
        switchToAutoMode();
        expect(document.body.classList.contains("dark")).toBeFalse();
    });
    it("should update theme when media query change event is triggered", () => {
        // Create a single dummy media query object to simulate changes.
        const dummyMediaQuery = createMediaQueryList(false);
        window.matchMedia = (query) => dummyMediaQuery;
        switchToAutoMode();
        // Initially, dummyMediaQuery.matches is false so light mode.
        expect(document.body.classList.contains("dark")).toBeFalse();
        // Simulate change to dark preference.
        dummyMediaQuery.setMatches(true);
        if (dummyMediaQuery.onchange) {
            dummyMediaQuery.onchange({ matches: true });
        }
        expect(document.body.classList.contains("dark")).toBeTrue();
        // Simulate change back to light preference.
        dummyMediaQuery.setMatches(false);
        if (dummyMediaQuery.onchange) {
            dummyMediaQuery.onchange({ matches: false });
        }
        expect(document.body.classList.contains("dark")).toBeFalse();
    });
    it("getCurrentThemeMode should return 'dark' when dark mode is set manually", () => {
        switchToDarkMode();
        expect(getCurrentThemeMode()).toBe("dark");
    });
    it("getCurrentThemeMode should return 'light' when light mode is set manually", () => {
        switchToLightMode();
        expect(getCurrentThemeMode()).toBe("light");
    });
    it("getCurrentThemeMode should return 'auto' when auto mode is enabled", () => {
        window.matchMedia = (query) => createMediaQueryList(true, query);
        switchToAutoMode();
        expect(getCurrentThemeMode()).toBe("auto");
    });
});
