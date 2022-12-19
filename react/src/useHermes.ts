import { useRef, useEffect } from "react";
import { useContextSelector } from "use-context-selector";
import HermesContext from "./HermesContext";

export default (collection) => {
  const connected = useContextSelector(
    HermesContext,
    (value) => value.connected
  );
  const register = useContextSelector(HermesContext, (value) => value.register);
  const unregister = useContextSelector(
    HermesContext,
    (value) => value.unregister
  );
  const documents = useContextSelector(HermesContext, (value) =>
    JSON.stringify(value.documents[collection] ?? [])
  );

  const registrationId: { current: string } = useRef("");

  useEffect(() => {
    if (connected) {
      if (!registrationId.current) {
        registrationId.current = register(collection);
      }

      return () => {
        if (registrationId.current) {
          unregister(collection, registrationId.current);
          registrationId.current = "";
        }
      };
    }
  }, [connected]);

  return JSON.parse(documents);
};
