import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { v4 as uuid } from "uuid";
import HermesContext from "./HermesContext";
import MemoWrapper from "./MemoWrapper";

const HermesProvider = ({ url, children }) => {
  const [connected, setConnected] = useState(false);
  const [subscriptions, setSubscriptions] = useState({});
  const [documents, setDocuments] = useState({});

  const socket: { current: WebSocket } = useRef();

  useEffect(() => {
    if (!connected && !socket.current) {
      const ws = new WebSocket(url);

      ws.addEventListener("close", () => {
        setConnected(false);
      });

      ws.addEventListener("error", () => {
        setConnected(false);
      });

      ws.addEventListener("message", ({ data }) => {
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
            throw "Message is not valid JSON";
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
            const { coll, id } = message.payload;
            setDocuments((d) => {
              const existingDocuments = { ...d };
              if (!existingDocuments[coll]) existingDocuments[coll] = {};
              existingDocuments[coll][id] = message.payload;
              return existingDocuments;
            });
          }
        }
      });

      socket.current = ws;
    }
  }, [connected]);

  const subscribe = (collection) => {
    if (!socket.current || socket.current.readyState !== 1)
      throw "No active connection";

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
  };

  return (
    <HermesContext.Provider
      value={{ connected, subscriptions, documents, subscribe }}
    >
      <MemoWrapper>{children}</MemoWrapper>
    </HermesContext.Provider>
  );
};

HermesProvider.propTypes = {
  url: PropTypes.string.isRequired,
  children: PropTypes.node,
};

export default HermesProvider;
