import { useRef } from "react";
import { useHermes, useHermesState } from "@hermes/react";

const App = () => {
  return (
    <div id="hermes-app">
      <h1>Hermes demo</h1>
      <HermesState />
      <AllUsers />
      <FilteredUsers />
    </div>
  );
};

const HermesState = () => {
  const { connected } = useHermesState();

  return (
    <div>
      <p>
        connected:{" "}
        <span data-testid="connected">{JSON.stringify(connected)}</span>
      </p>
    </div>
  );
};

const RenderUsers = ({ users }) => (
  <>
    {users.map((user) => (
      <div style={{ border: "1px solid black", padding: "0px 16px" }}>
        {Object.entries(user).map(([k, v]) => (
          <p>
            {k}:{" "}
            <span className={k}>
              {typeof v === "string" ? v : JSON.stringify(v)}
            </span>
          </p>
        ))}
      </div>
    ))}
  </>
);

const AllUsers = () => {
  const users = useHermes("test_users");

  const renderCount = useRef(0);
  renderCount.current = renderCount.current + 1;

  return (
    <div style={{ border: "1px solid black", padding: "0px 16px" }}>
      <p>AllUsers</p>
      <p>
        renders:{" "}
        <span data-testid="allusers-renders">{renderCount.current}</span>
      </p>
      <div data-testid="allusers-documents">
        <RenderUsers users={users} />
      </div>
    </div>
  );
};

const FilteredUsers = () => {
  const users = useHermes("test_users", [{ $match: { username: "bob" } }]);

  const renderCount = useRef(0);
  renderCount.current = renderCount.current + 1;

  return (
    <div style={{ border: "1px solid black", padding: "0px 16px" }}>
      <p>AllUsers</p>
      <p>
        renders:{" "}
        <span data-testid="filteredusers-renders">{renderCount.current}</span>
      </p>
      <div data-testid="filteredusers-documents">
        <RenderUsers users={users} />
      </div>
    </div>
  );
};

export default App;
