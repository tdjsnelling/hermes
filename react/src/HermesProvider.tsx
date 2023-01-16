import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { v4, v5 } from "uuid";
import HermesContext from "./HermesContext";
import MemoWrapper from "./MemoWrapper";

export type SubscriptionsStore = {
  [key: string]: {
    subscribed: boolean;
    registered: Set<string>;
  };
};

export type DocumentsStore = {
  [key: string]: {
    [key: string]: Partial<{
      _id: string;
      _hermes_registrationIds: Set<string>;
    }>;
  };
};

const NAMESPACE = "c07d54d6-9f61-436b-a1da-e0059a6b5530";

const HermesProvider = ({ url, children }) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionsStore>({});
  const [documents, setDocuments] = useState<DocumentsStore>({});

  const socket: { current: WebSocket } = useRef();
  const clientId: { current: string } = useRef();
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
    registrationId,
    operation,
    insertData,
    deleteData,
  }) => {
    setDocuments((d) => {
      const existingDocuments: DocumentsStore = { ...d };
      if (!existingDocuments[coll]) existingDocuments[coll] = {};

      if (operation === "insert") {
        for (const doc of insertData) {
          const mergedDoc = { ...doc, _hermes_registrationIds: new Set() };

          if (existingDocuments[coll][doc._id])
            mergedDoc._hermes_registrationIds =
              existingDocuments[coll][doc._id]._hermes_registrationIds;

          mergedDoc._hermes_registrationIds.add(registrationId);

          existingDocuments[coll][doc._id] = mergedDoc;
        }
      } else if (operation === "delete") {
        for (const deletion of deleteData) {
          const { _id, registrationId: deleteRegistrationId } = deletion;

          if (!existingDocuments[coll][_id]) return;

          if (deleteRegistrationId) {
            existingDocuments[coll][_id]._hermes_registrationIds.delete(
              deleteRegistrationId
            );

            if (existingDocuments[coll][_id]._hermes_registrationIds.size === 0)
              delete existingDocuments[coll][_id];
          } else {
            delete existingDocuments[coll][_id];
          }
        }
      }

      return existingDocuments;
    });
  };

  useEffect(() => {
    initWebsocket((ws, data) => {
      if (data === "hermes") {
        const id = v4();
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
            const existingDocuments: DocumentsStore = { ...d };

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

            setSubscriptions((s) => {
              const existingSubscriptions: SubscriptionsStore = { ...s };

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
            const { collection, registrationId } = message.payload;

            setSubscriptions((s) => {
              const existingSubscriptions: SubscriptionsStore = { ...s };

              if (!existingSubscriptions[collection])
                existingSubscriptions[collection] = {
                  subscribed: false,
                  registered: new Set(),
                };

              if (existingSubscriptions[collection].registered.size === 0)
                existingSubscriptions[collection].subscribed = false;

              return existingSubscriptions;
            });

            setDocuments((d) => {
              const existingDocuments: DocumentsStore = { ...d };

              for (const [_id, doc] of Object.entries(
                existingDocuments[collection]
              )) {
                doc._hermes_registrationIds.delete(registrationId);
                if (doc._hermes_registrationIds.size === 0) {
                  delete existingDocuments[collection][_id];
                }
              }

              return existingDocuments;
            });
          }
        }

        if (message.reply === "data") {
          updateData(message.payload);
        }
      }
    });
  }, []);

  const register = useCallback(
    (collection: string, query?: object[]) => {
      if (!socket.current || socket.current.readyState !== 1) {
        console.error("hermes: error: no active websocket connection");
        return;
      }

      let registrationId = v5(
        `${collection},${JSON.stringify(query)}`,
        NAMESPACE
      );

      const alreadySubscribed = Array.from(
        subscriptions[collection]?.registered ?? []
      ).filter((id) => id.startsWith(registrationId));

      if (!alreadySubscribed.length)
        socket.current.send(
          JSON.stringify({
            type: "subscribe",
            payload: {
              collection,
              query,
              registrationId,
            },
          })
        );

      registrationId = `${registrationId}_${alreadySubscribed.length}`;

      setSubscriptions((s) => {
        const existingSubscriptions: SubscriptionsStore = { ...s };

        if (!existingSubscriptions[collection])
          existingSubscriptions[collection] = {
            subscribed: false,
            registered: new Set(),
          };

        existingSubscriptions[collection].registered.add(registrationId);

        return existingSubscriptions;
      });

      return registrationId;
    },
    [socket.current?.readyState, subscriptionsValue]
  );

  const unregister = useCallback(
    (collection: string, registrationId: string) => {
      setSubscriptions((s) => {
        const existingSubscriptions: SubscriptionsStore = { ...s };

        if (existingSubscriptions[collection]?.registered instanceof Set) {
          existingSubscriptions[collection].registered.delete(registrationId);

          const [rootId] = registrationId.split("_");

          if (
            existingSubscriptions[collection].subscribed &&
            Array.from(existingSubscriptions[collection].registered).filter(
              (id) => id.startsWith(rootId)
            ).length === 0
          ) {
            socket.current.send(
              JSON.stringify({
                type: "unsubscribe",
                payload: {
                  collection,
                  registrationId: rootId,
                },
              })
            );
          }
        }

        return existingSubscriptions;
      });
    },
    []
  );

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
