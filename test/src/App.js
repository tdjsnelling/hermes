import { useHermes, useHermesState } from "@hermes/react";

const App = () => {
  return (
    <div id="hermes-app">
      <HermesState />
    </div>
  );
};

const HermesState = () => {
  const { connected } = useHermesState();

  return (
    <div>
      <p data-testid="connected">{JSON.stringify(connected)}</p>
    </div>
  );
};

export default App;
