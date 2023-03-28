# @hermes/react

Hermes is a real-time data framework for MongoDB + React. It uses native MongoDB change streams and WebSockets to ensure that the state of your React app reflects the content of your database in real-time.

Hermes comes in 2 parts:
* [`@hermes/server`](../server): creates MongoDB change stream listeners and handles subscriptions from React.
* `@hermes/react`: provides a `useHermes` hook to access real-time data.

## React

Install with `yarn add @hermes/react` or `npm install @hermes/react`.

### `HermesProvider`

To use Hermes in your React application, you will first need to wrap your application with the provider component `HermesProvider`. This should go somewhere at the root of your application structure.

The only prop that the provider requires is `url`, the WebSocket endpoint of your Hermes server.

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HermesProvider } from "@hermes/react";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <HermesProvider url="wss://example.com:9000">
    <App />
  </HermesProvider>
);
```

### `useHermes`

The `useHermes` hook allows you to access real-time data as it appears in your MongoDB database. It can only be used in a component that is a child of the `HermesProvider`.

The most basic usage is to just pass the name of the collection you want to return real-time documents for. 

```jsx
import React from "react";
import { useHermes } from "@hermes/react";

const Component = () => {
  const users = useHermes("users");

  return (
    <pre>
      {JSON.stringify(users, null, 2)}
    </pre>
  );
}
```

In the background, Hermes will handle registering the hook with the provider, sending a 'subscribe' message to the server, and receiving documents and changes as they occur in real-time. When the component is unmounted, the hook will be de-registered. If there are no remaining registered hooks for a specific collection, that collection will also be unsubscribed from.

#### MongoDB query pipelines

As a second argument, the `useHermes` hook can take a MongoDB [aggregate pipeline](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/). This allows you filter (and perform other operations on) the documents that are returned to the client and updated in real-time.

For example: to filter, sort, and return only 10 documents from the "users" collection, you could use:

```javascript
const users = useHermes("users", [
  {
    $match: { verified: true }
  },
  {
    $sort: { createdAt: -1 }
  },
  {
    $limit: 10
  }
]);
```

Only the resulting documents will be returned by the `useHermes` hook. Importantly, real-time updates will only be sent and the component using the hook will only re-render when the returned documents change; any other changes within the same collection will be ignored.

You can have multiple hooks subscribed to the same collection using different queries. If 2 hooks return some identical documents, they will be de-duped to reduce the size of the client-side document storage.

### `useHermesState`

The `useHermesState` hook returns some potentially useful information around the internal state of the Hermes provider.

```jsx
import React from "react";
import { useHermesState } from "@hermes/react";

const Component = () => {
  const { url, connected, clientId, subscriptions } = useHermesState();
  
  ...
}
```

| Key             | Description                                                          |
|-----------------|----------------------------------------------------------------------|
| `url`           | The URL of the Hermes server                                         |
| `connected`     | Boolean connected status                                             |
| `clientId`      | The UUID of the current client                                       |
| `subscriptions` | A map of MongoDB collections containing subscription status for each |
