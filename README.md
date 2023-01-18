# Hermes

Hermes is a real-time data framework for MongoDB + React. It uses native MongoDB change streams and WebSockets to ensure that the state of your React app reflects the content of your database in real-time.

Hermes comes in 2 parts:
* [`@hermes/server`](server): creates MongoDB change stream listeners and handles subscriptions from React.
* [`@hermes/react`](react): provides a `useHermes` hook to access real-time data.

## License

[GNU GPLv3](LICENSE)
