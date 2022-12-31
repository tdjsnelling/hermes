import { useContextSelector } from "use-context-selector";
import HermesContext from "./HermesContext";
import { SubscriptionsStore } from "./HermesProvider";

export default (): {
  url: string;
  connected: boolean;
  clientId: string;
  subscriptions: SubscriptionsStore;
} => {
  const url = useContextSelector(HermesContext, (value) => value.url);
  const connected = useContextSelector(
    HermesContext,
    (value) => value.connected
  );
  const clientId = useContextSelector(HermesContext, (value) => value.clientId);
  const subscriptionsString = useContextSelector(HermesContext, (value) => {
    const subscriptions: SubscriptionsStore = value.subscriptions;
    const subscriptionsWithArrays = {};

    for (const [collection, info] of Object.entries(subscriptions)) {
      subscriptionsWithArrays[collection] = {
        ...info,
        registered: Array.from(info.registered),
      };
    }

    return JSON.stringify(subscriptionsWithArrays);
  });

  return {
    url,
    connected,
    clientId,
    subscriptions: JSON.parse(subscriptionsString),
  };
};
