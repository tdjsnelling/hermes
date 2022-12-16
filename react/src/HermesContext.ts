import { createContext } from "react";

export default createContext({
  url: "",
  connected: false,
  subscriptions: {},
  documents: {},
  subscribe: (collection: string) => {},
});
