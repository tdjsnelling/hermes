import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { v4 as uuid } from "uuid";
import HermesContext from "./HermesContext";
import MemoWrapper from "./MemoWrapper";

type SubscriptionsStore = {
  [key: string]: {
    subscribed: boolean;
    registered: Set<string>;
  };
};

type DocumentsStore = {
  [key: string]: {
    [key: string]: Partial<{ _id: string }>;
  };
};

const HermesProvider = ({ url, children }) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionsStore>({});
  const [documents, setDocuments] = useState<DocumentsStore>({});

  const socket: { current: WebSocket } = useRef();
  const clientId: { current: string } = useRef();
  const subscribeQueue: { current: Set<string> } = useRef(new Set<string>());
  const retry: { current: ReturnType<typeof setTimeout> } = useRef();

  const subscriptionsValue = JSON.stringify(
    Object.entries(subscriptions).reduce((acc, [collection, info]) => {
      acc[collection] = {
        subscribed: info.subscribed,
        registered: Array.from(info.registered),
      };
      return acc;
    }, {})
  );

  const initWebsocket = (handleMessage) => {
    if (retry.current) {
      clearTimeout(retry.current);
      retry.current = undefined;
    }

    const ws = new WebSocket(url);

    ws.addEventListener("close", () => {
      setConnected(false);
      if (!retry.current)
        retry.current = setTimeout(() => {
          initWebsocket(handleMessage);
        }, 1000);
    });

    ws.addEventListener("error", () => {
      ws.close();
    });

    ws.addEventListener("message", ({ data }) => {
      handleMessage(ws, data);
    });

    socket.current = ws;
  };

  const updateData = ({
    coll,
    operation,
    insertData,
    deleteData,
    updateData,
  }) => {
    setDocuments((d) => {
      const existingDocuments = { ...d };
      if (!existingDocuments[coll]) existingDocuments[coll] = {};

      if (operation === "insert") {
        for (const doc of insertData) {
          existingDocuments[coll][doc._id] = doc;
        }
      } else if (operation === "delete") {
        for (const _id of deleteData) {
          delete existingDocuments[coll][_id];
        }
      } else if (operation === "update") {
        for (const update of updateData) {
          const { _id, updateDescription } = update;

          for (const [field, value] of Object.entries(
            updateDescription.updatedFields
          )) {
            existingDocuments[coll][_id][field] = value;
          }

          for (const field of updateDescription.removedFields) {
            delete existingDocuments[coll][_id][field];
          }
        }
      }

      return existingDocuments;
    });
  };

  useEffect(() => {
    initWebsocket((ws, data) => {
      if (data === "hermes") {
        const id = uuid();
        clientId.current = id;

        ws.send(
          JSON.stringify({
            type: "identify",
            payload: {
              id,
            },
          })
        );
      } else {
        let message;
        try {
          message = JSON.parse(data);
        } catch (e) {
          console.error("hermes: error: message is not valid json");
          return;
        }

        if (message.reply === "identify") {
          if (!message.error) setConnected(true);
        }

        if (message.reply === "collections") {
          const { collections } = message.payload;
          setDocuments((d) => {
            const existingDocuments = { ...d };
            for (const collection of collections) {
              if (!existingDocuments[collection])
                existingDocuments[collection] = {};
            }
            return existingDocuments;
          });
        }

        if (message.reply === "subscribe") {
          if (!message.error) {
            const { collection } = message.payload;

            subscribeQueue.current.delete(collection);

            setSubscriptions((s) => {
              const existingSubscriptions = { ...s };

              if (!existingSubscriptions[collection])
                existingSubscriptions[collection] = {
                  subscribed: false,
                  registered: new Set(),
                };

              existingSubscriptions[collection].subscribed = true;

              return existingSubscriptions;
            });
          }
        }

        if (message.reply === "unsubscribe") {
          if (!message.error) {
            const { collection } = message.payload;

            subscribeQueue.current.delete(collection);

            setSubscriptions((s) => {
              const existingSubscriptions = { ...s };

              if (!existingSubscriptions[collection])
                existingSubscriptions[collection] = {
                  subscribed: false,
                  registered: new Set(),
                };

              existingSubscriptions[collection].subscribed = false;

              return existingSubscriptions;
            });
          }
        }

        if (message.reply === "data") {
          updateData(message.payload);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (connected) console.log(subscriptions);
  }, [connected]);

  const register = useCallback(
    (collection: string) => {
      if (!socket.current || socket.current.readyState !== 1) {
        console.error("hermes: error: no active websocket connection");
        return;
      }

      if (subscribeQueue.current.has(collection)) return;

      const alreadySubscribed = subscriptions[collection]?.registered.size > 0;

      if (!alreadySubscribed) {
        socket.current.send(
          JSON.stringify({
            type: "subscribe",
            payload: {
              collection,
            },
          })
        );
      }

      const registrationId = uuid();

      setSubscriptions((s) => {
        const existingSubscriptions = { ...s };

        if (!existingSubscriptions[collection])
          existingSubscriptions[collection] = {
            subscribed: false,
            registered: new Set(),
          };

        existingSubscriptions[collection].registered.add(registrationId);

        return existingSubscriptions;
      });

      subscribeQueue.current.add(collection);

      return registrationId;
    },
    [socket.current?.readyState, subscriptionsValue]
  );

  const unregister = useCallback((collection: string, id: string) => {
    if (subscribeQueue.current.has(collection)) return;

    setSubscriptions((s) => {
      const existingSubscriptions = { ...s };
      if (existingSubscriptions[collection]?.registered instanceof Set) {
        existingSubscriptions[collection].registered.delete(id);
      }
      return existingSubscriptions;
    });
  }, []);

  useEffect(() => {
    if (connected) {
      for (const [collection, info] of Object.entries(subscriptions)) {
        if (info.registered.size === 0 && info.subscribed) {
          socket.current.send(
            JSON.stringify({
              type: "unsubscribe",
              payload: {
                collection,
              },
            })
          );

          setDocuments((d) => {
            const existingDocuments = { ...d };
            existingDocuments[collection] = {};
            return existingDocuments;
          });
        }
      }
    }
  }, [subscriptionsValue]);

  const hermesState = {
    url,
    connected,
    clientId: clientId.current,
    subscriptions,
    documents,
    register,
    unregister,
  };
  window["__hermes"] = hermesState;

  return (
    <HermesContext.Provider value={hermesState}>
      <MemoWrapper>{children}</MemoWrapper>
    </HermesContext.Provider>
  );
};

HermesProvider.propTypes = {
  url: PropTypes.string.isRequired,
  children: PropTypes.node,
};

export default HermesProvider;
