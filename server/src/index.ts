import { MongoClient, ChangeStream } from "mongodb";
import { WebSocketServer, WebSocket } from "ws";
import { Message, DataReply } from "./message-types";

interface WebSocketWithUid extends WebSocket {
  uid?: string;
}

type SubscriptionMap = {
  [key: string]: {
    [key: string]: ChangeStream;
  };
};

export default async ({ port = 9000 }) => {
  const subscriptionMap: SubscriptionMap = {};

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

      ws.on("message", async (data) => {
        let message: Message;

        try {
          message = JSON.parse(data.toString());
        } catch (e) {
          reply({ reply: "none", error: "Message must be valid JSON" });
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

          const collections = await client
            .db(process.env.MONGO_DB)
            .listCollections();
          const collectionsArray = await collections.toArray();

          reply({
            reply: "collections",
            payload: {
              collections: collectionsArray.map((c) => c.name),
            },
          });
          return;
        }

        if (!ws.uid) {
          reply({ reply: "none", error: "Client has not identified itself" });
          return;
        }

        if (message.type === "subscribe") {
          const { collection, query } = message.payload;

          if (!collection) {
            reply({
              reply: "subscribe",
              error: "`collection` must be specified",
            });
            return;
          }

          if (!subscriptionMap[ws.uid]) subscriptionMap[ws.uid] = {};

          const pipeline = query ?? [];

          const stream = client
            .db(process.env.MONGO_DB)
            .collection(collection)
            .watch(pipeline);

          subscriptionMap[ws.uid][collection] = stream;

          handleChangeStream(stream, server, ws.uid);

          reply({
            reply: "subscribe",
            payload: {
              collection,
            },
          });

          const docs = await client
            .db(process.env.MONGO_DB)
            .collection(collection)
            .aggregate(pipeline)
            .toArray();

          reply({
            reply: "data",
            payload: {
              coll: collection,
              operation: "insert",
              insertData: docs,
            },
          });
        }

        if (message.type === "unsubscribe") {
          const { collection } = message.payload;

          if (!collection) {
            reply({
              reply: "unsubscribe",
              error: "`collection` must be specified",
            });
            return;
          }

          if (subscriptionMap[ws.uid][collection]) {
            subscriptionMap[ws.uid][collection].close();
            delete subscriptionMap[ws.uid][collection];
          }

          reply({
            reply: "unsubscribe",
            payload: {
              collection,
            },
          });
        }
      });

      ws.on("close", () => {
        for (const stream of Object.values(subscriptionMap[ws.uid] ?? {})) {
          stream.close();
        }
        delete subscriptionMap[ws.uid];
      });

      ws.send("hermes");
    });

    console.log(`hermes server running at ws://localhost:${port}`);
  } catch (e) {
    console.error(`hermes: error: ${e}`);
  }
};

const handleChangeStream = (stream, server, uid) => {
  stream.on("change", (event) => {
    if (
      event.operationType === "insert" ||
      event.operationType === "delete" ||
      event.operationType === "update"
    ) {
      const { coll } = event.ns;

      const message: DataReply = {
        reply: "data",
        payload: {
          coll,
          operation: event.operationType,
        },
      };

      if (event.operationType === "insert")
        message.payload.insertData = [event.fullDocument];
      else if (event.operationType === "delete")
        message.payload.deleteData = [event.documentKey._id.toString()];
      else if (event.operationType === "update")
        message.payload.updateData = [
          {
            _id: event.documentKey._id.toString(),
            updateDescription: event.updateDescription,
          },
        ];

      const ws = Array.from(server.clients).find(
        (ws: WebSocketWithUid) => ws.uid === uid
      ) as WebSocketWithUid;
      ws.send(JSON.stringify(message));
    }
  });
};
