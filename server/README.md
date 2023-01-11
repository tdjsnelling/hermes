# @hermes/server

Hermes is a real-time data framework for MongoDB + React. It uses native MongoDB change streams and WebSockets to ensure that the state of your React app reflects the content of your database in real-time.

Hermes comes in 2 parts: 
* [`@hermes/server`](https://github.com/tdjsnelling/hermes/tree/master/server): creates MongoDB change stream listeners and handles subscriptions from React.
* [`@hermes/react`](https://github.com/tdjsnelling/hermes/tree/master/react): provides a `useHermes` hook to access real-time data.

## Server

The server can be incorporated into your application in 2 ways. It can be installed as a Node.js module and initialised in your existing server code, or it can be run as a standalone Docker service.

### Adding to an existing Node.js server

Install with `yarn add @hermes/server` or `npm install @hermes/server`.

In your code, initialise the server with valid options:

```javascript
import hermes from "@hermes/server";

hermes({
  port: 1234,               // Port to serve on (default 9000)
  srv: "mongodb+srv://...", // SRV of your MongoDB instance
  db: "my_db"               // Name of your desired database
});
```

### Running as a standalone Docker service

```shell
docker run -d -p 9000:9000 -e MONGO_SRV=... -e MONGO_DB=... tdjsnelling/hermes-server:latest
```
