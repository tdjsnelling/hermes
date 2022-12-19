import { useEffect } from "react";
import { useContextSelector } from "use-context-selector";
import HermesContext from "./HermesContext";

export default (collection) => {
  const connected = useContextSelector(
    HermesContext,
    (value) => value.connected
  );
  const subscribe = useContextSelector(
    HermesContext,
    (value) => value.subscribe
  );
  const documents = useContextSelector(HermesContext, (value) =>
    JSON.stringify(value.documents[collection] ?? [])
  );

  useEffect(() => {
    if (connected) {
      subscribe(collection);
    }
  }, [connected]);

  return JSON.parse(documents);
};
