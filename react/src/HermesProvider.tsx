import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { v4 as uuid } from "uuid";
import HermesContext from "./HermesContext";
import MemoWrapper from "./MemoWrapper";

type SubscriptionsStore = {
  [key: string]: string[];
};

type DocumentsStore = {
  [key: string]: {
    [key: string]: Partial<{ _id: string }>;
  };
};

const initWebsocket = (url, setConnected, socketRef, handleMessage) => {
  const ws = new WebSocket(url);

  let retry;

  ws.addEventListener("open", () => {
    if (retry) {
      clearTimeout(retry);
      retry = undefined;
    }
  });

  ws.addEventListener("close", () => {
    setConnected(false);
    socketRef.current = undefined;

    if (!retry)
      retry = setTimeout(() => {
        initWebsocket(url, setConnected, socketRef, handleMessage);
      }, 1000);
  });

  ws.addEventListener("error", () => {
    ws.close();
  });

  ws.addEventListener("message", ({ data }) => {
    handleMessage(ws, data);
  });

  socketRef.current = ws;
};

const HermesProvider = ({ url, children }) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionsStore>({});
  const [documents, setDocuments] = useState<DocumentsStore>({});

  const socket: { current: WebSocket } = useRef();

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
    if (!connected && !socket.current) {
      initWebsocket(url, setConnected, socket, (ws, data) => {
        if (data === "hermes") {
          const id = uuid();
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
          } else if (message.reply === "subscribe") {
            if (!message.error) {
              setSubscriptions((s) => {
                const existingSubscriptions = { ...s };
                existingSubscriptions[message.payload.collection] =
                  message.payload.id;
                return existingSubscriptions;
              });
            }
          } else if (message.reply === "data") {
            updateData(message.payload);
          }
        }
      });
    }
  }, [connected]);

  const subscribe = useCallback(
    (collection: string) => {
      if (!socket.current || socket.current.readyState !== 1) {
        console.error("hermes: error: no active websocket connection");
        return;
      }

      const alreadySubscribed = !!subscriptions[collection];

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
    },
    [socket.current, JSON.stringify(subscriptions)]
  );

  const hermesState = { url, connected, subscriptions, documents, subscribe };
  window["hermes"] = hermesState;

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
