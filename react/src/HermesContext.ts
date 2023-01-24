import { createContext } from "use-context-selector";

export default createContext({
  url: "",
  connected: false,
  clientId: "",
  subscriptions: {},
  documents: {},
  register: (collection: string, query?: object[]): string => "",
  unregister: (collection: string, id: string): void => {},
});
