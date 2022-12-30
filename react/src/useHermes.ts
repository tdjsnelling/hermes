import { useRef, useEffect } from "react";
import { useContextSelector } from "use-context-selector";
import HermesContext from "./HermesContext";

export default (collection: string, modifier?: Function): object[] => {
  const connected = useContextSelector(
    HermesContext,
    (value) => value.connected
  );
  const register = useContextSelector(HermesContext, (value) => value.register);
  const unregister = useContextSelector(
    HermesContext,
    (value) => value.unregister
  );
  const documents = useContextSelector(HermesContext, (value) => {
    const { documents } = value;
    const documentsArray = Object.values(documents[collection] ?? {});
    return JSON.stringify(
      typeof modifier === "function" ? modifier(documentsArray) : documentsArray
    );
  });

  const registrationId: { current: string } = useRef("");

  useEffect(() => {
    if (connected) {
      registrationId.current = register(collection);
    } else {
      unregister(collection, registrationId.current);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      if (registrationId.current) {
        unregister(collection, registrationId.current);
      }
    };
  }, []);

  return JSON.parse(documents);
};
