import { createContext } from "use-context-selector";

export default createContext({
  url: "",
  connected: false,
  subscriptions: {},
  documents: {},
  subscribe: (collection: string) => {},
});
