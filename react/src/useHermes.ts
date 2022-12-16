import { useContext, useEffect, useMemo } from "react";
import HermesContext from "./HermesContext";

export default (collection) => {
  const { connected, subscribe, documents } = useContext(HermesContext);

  useEffect(() => {
    if (connected) {
      subscribe(collection);
    }
  }, [connected]);

  return useMemo(
    () => documents[collection] ?? [],
    [JSON.stringify(documents[collection] ?? {})]
  );
};
