import { MongoClient } from "mongodb";
import { config } from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuid } from "uuid";
import { Message } from "./message-types";

interface WebSocketWithUid extends WebSocket {
  uid?: string;
}

const subscriptionMap: { [key: string]: Set<string> } = {};

const main = async (port) => {
  const client = new MongoClient(process.env.MONGO_SRV);
  const server = new WebSocketServer({
    port,
  });

  try {
    await client.connect();

    server.on("connection", (ws: WebSocketWithUid) => {
      const reply = (data: {
        reply: string;
        payload?: object;
        error?: string;
      }) => {
        ws.send(JSON.stringify(data));
      };

      ws.on("message", (data) => {
        let message: Message;

        try {
          message = JSON.parse(data.toString());
        } catch (e) {
          reply({ reply: "none", error: "Message must be valid JSON" });
          ws.close();
          return;
        }

        if (message.type === "identify") {
          const { id } = message.payload;
          if (!id) {
            reply({ reply: "identify", error: "`id` must be specified" });
            return;
          }
          ws.uid = id;
          reply({
            reply: "identify",
            payload: {
              message: `Client is known as \`${id}\``,
            },
          });
          return;
        }

        if (!ws.uid) {
          reply({ reply: "none", error: "Client has not identified itself" });
          return;
        }

        if (message.type === "subscribe") {
          const { collection } = message.payload;

          if (!collection) {
            reply({
              reply: "subscribe",
              error: "`collection` must be specified",
            });
            return;
          }

          if (!subscriptionMap[collection])
            subscriptionMap[collection] = new Set();

          const id = uuid();

          subscriptionMap[collection].add(ws.uid);

          reply({
            reply: "subscribe",
            payload: {
              collection,
              id,
            },
          });
        }

        if (message.type === "unsubscribe") {
          const { collection, id } = message.payload;

          if (!collection) {
            reply({
              reply: "unsubscribe",
              error: "`collection` must be specified",
            });
            return;
          }

          if (!id) {
            reply({
              reply: "unsubscribe",
              error: "`id` must be specified",
            });
            return;
          }

          if (subscriptionMap[collection] instanceof Set)
            subscriptionMap[collection].delete(ws.uid);

          reply({
            reply: "unsubscribe",
            payload: {
              collection,
            },
          });
        }
      });

      ws.on("close", () => {
        for (const subscriberSet of Object.values(subscriptionMap)) {
          subscriberSet.delete(ws.uid);
        }
      });

      ws.send("hermes");
    });

    const stream = client.db(process.env.MONGO_DB).watch();
    stream.on("change", (event) => {
      if (
        event.operationType === "insert" ||
        event.operationType === "delete" ||
        event.operationType === "update"
      ) {
        const { coll } = event.ns;

        const message: {
          reply: "data";
          payload: {
            coll: string;
            operation: "insert" | "delete" | "update";
            id: string;
            insert?: object;
            update?: object;
          };
        } = {
          reply: "data",
          payload: {
            coll,
            operation: event.operationType,
            id: event.documentKey._id.toString(),
          },
        };

        if (event.operationType === "insert")
          message.payload.insert = event.fullDocument;
        else if (event.operationType === "update")
          message.payload.update = event.updateDescription;

        const subscribers = subscriptionMap[coll];
        const sockets = Array.from(server.clients).filter(
          (ws: WebSocketWithUid) =>
            subscribers instanceof Set && subscribers.has(ws.uid)
        );
        sockets.forEach((ws) => ws.send(JSON.stringify(message)));
      }
    });
  } catch (e) {
    console.error(e);
  }
};

config();
const port = Number(process.env.PORT) || 9000;
main(port).then(() =>
  console.log(`hermes server running at ws://localhost:${port}`)
);
