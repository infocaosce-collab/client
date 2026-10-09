import Authorization from "./routes/private/Authorization";
import { GlobalContextProviders } from "./components/shared/providers/_globalContextProviders";

function App() {
  return (
    <GlobalContextProviders>
      <section className="App" id="osceExamAppId">
        <Authorization />
      </section>
    </GlobalContextProviders>
  );
}

export default App;
