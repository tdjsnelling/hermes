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

```javascript
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

```javascript
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

TODO

#### Modifier functions

As a second argument, the `useHermes` hook can take a 'modifier function'. These are functions that effect which documents will be returned by the hook.

For example, if you only wanted to see (and receive real-time updates for) the latest 10 documents for a collection, you could do:

```javascript
const sortCreatedAt = (a, b) => { ... };

const users = useHermes("users", (documents) => {
  return documents.sort(sortCreatedAt).slice(0, 10);
});
```

The important feature of this pattern is that the hook will only update (and thus the component will only re-render) when the documents returned by the modifier function change. If you returned all documents in a collection from the hook and then performed a `slice` afterwards, the component would re-render when *any* document in that collection was updated.

### `useHermesState`

The `useHermesState` hook returns some potentially useful information around the internal state of the Hermes provider.

```javascript
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
