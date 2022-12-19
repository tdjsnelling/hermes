import { createContext } from "use-context-selector";

export default createContext({
  url: "",
  connected: false,
  subscriptions: {},
  documents: {},
  register: (collection: string): string => "",
  unregister: (collection: string, id: string): void => {},
});
