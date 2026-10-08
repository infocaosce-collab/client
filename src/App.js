import Authorization from "./Authorization";
import { GlobalContextProviders } from "./components/_globalContextProviders";

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
