import { useContext, useEffect } from "react";
import HermesContext from "./HermesContext";

export default (collection) => {
  const { connected, subscribe, subscriptions, documents } =
    useContext(HermesContext);

  useEffect(() => {
    if (connected) {
      subscribe(collection);
    }
  }, [connected]);

  return { documents, subscriptions };
};
