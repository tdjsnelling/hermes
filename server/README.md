# @hermes/server

Hermes is a real-time data framework for MongoDB + React. It uses native MongoDB change streams and WebSockets to ensure that the state of your React app reflects the content of your database in real-time.

Hermes comes in 2 parts: 
* `@hermes/server`: creates MongoDB change stream listeners and handles subscriptions from React.
* [`@hermes/react`](../react): provides a `useHermes` hook to access real-time data.

## Server

Install with `yarn add @hermes/server` or `npm install @hermes/server`.

In your code, initialise the server with valid options:

```javascript
import hermes from "@hermes/server";

hermes({
  // Port to serve on (default 9000)
  port: 1234,

  // SRV of your MongoDB instance
  srv: "mongodb+srv://...",

  // Name of your desired database
  db: "my_db",

  // Mongo collection whitelist (see below)
  whitelist: {
    users: [
      "username",
      "name.firstName",
      "name.lastName",
    ]
  }
});
```

### Whitelist

When initialising your server, you need to explicitly whitelist the collections and fields from documents in those collections before they are accessible from the client.

This is to prevent leaking sensitive information from your database by mistake or by manipulation from the client.

You can think of it like a MongoDB projection: only fields included here will be present in returned documents. If a collection is not included in the whitelist, no documents from that collection will be accessible.

Only [dot notation](https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/#embedded-document-fields) is supported, nested fields are not.
