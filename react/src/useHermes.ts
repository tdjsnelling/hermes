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
    if (connected && !registrationId.current) {
      registrationId.current = register(collection);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      if (registrationId.current) {
        unregister(collection, registrationId.current);
      }
    };
  }, []);

  return Object.values(JSON.parse(documents));
};
