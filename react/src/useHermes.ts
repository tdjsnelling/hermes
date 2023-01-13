import { useRef, useEffect } from "react";
import { useContextSelector } from "use-context-selector";
import HermesContext from "./HermesContext";
import { DocumentsStore } from "./HermesProvider";

export default (
  collection: string,
  query?: object[],
  modifier?: Function
): object[] => {
  const registrationId: { current: string } = useRef("");

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
    const { documents }: { documents: DocumentsStore } = value;
    const [rootId] = registrationId.current.split("_");
    const documentsArray = Object.values(documents[collection] ?? {})
      .filter((document) => document._hermes_registrationIds.has(rootId))
      .map((document) => {
        const clone = { ...document };
        delete clone._hermes_registrationIds;
        return clone;
      });
    return JSON.stringify(
      typeof modifier === "function" ? modifier(documentsArray) : documentsArray
    );
  });

  useEffect(() => {
    if (connected) {
      registrationId.current = register(collection, query);
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
