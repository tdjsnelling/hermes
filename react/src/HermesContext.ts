import { createContext } from "react";

export default createContext({
  connected: false,
  subscriptions: {},
  documents: {},
  subscribe: (collection: string) => {},
});
