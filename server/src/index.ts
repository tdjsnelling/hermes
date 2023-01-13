import { MongoClient, GenericListener } from "mongodb";
import { WebSocketServer, WebSocket } from "ws";
import { Message, DataReply } from "./message-types";

interface WebSocketWithUid extends WebSocket {
  uid?: string;
}

// clientId -> collection -> registrationId: stream handler
type SubscriptionMap = {
  [key: string]: {
    [key: string]: {
      [key: string]: GenericListener;
    };
  };
};

export default async ({
  port = 9000,
  srv,
  db,
}: {
  port?: number;
  srv: string;
  db: string;
}) => {
  const subscriptionMap: SubscriptionMap = {};

  const client = new MongoClient(srv);
  const server = new WebSocketServer({
    port,
  });

  try {
    await client.connect();
    console.log("hermes: connected to mongo database");

    const globalStream = client.db(db).watch(
      [
        {
          $match: {
            $or: [
              { operationType: "insert" },
              { operationType: "update" },
              { operationType: "delete" },
            ],
          },
        },
      ],
      { fullDocument: "updateLookup" }
    );

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

          const collections = await client.db(db).listCollections();
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
          const { collection, query, registrationId } = message.payload;

          if (!collection) {
            reply({
              reply: "subscribe",
              error: "`collection` must be specified",
            });
            return;
          }

          if (!registrationId) {
            reply({
              reply: "subscribe",
              error: "`registrationId` must be specified",
            });
            return;
          }

          if (!subscriptionMap[ws.uid]) subscriptionMap[ws.uid] = {};
          if (!subscriptionMap[ws.uid][collection])
            subscriptionMap[ws.uid][collection] = {};

          const pipeline = query ?? [];

          const handler = getChangeStreamHandler(
            server,
            client.db(db).collection(collection),
            ws.uid,
            registrationId,
            pipeline
          );

          subscriptionMap[ws.uid][collection][registrationId] = handler;

          globalStream.on("change", handler);

          reply({
            reply: "subscribe",
            payload: {
              collection,
              registrationId,
            },
          });

          const docs = await client
            .db(db)
            .collection(collection)
            .aggregate(pipeline)
            .toArray();

          reply({
            reply: "data",
            payload: {
              coll: collection,
              operation: "insert",
              insertData: docs,
              registrationId,
            },
          });
        }

        if (message.type === "unsubscribe") {
          const { collection, registrationId } = message.payload;

          if (!collection) {
            reply({
              reply: "unsubscribe",
              error: "`collection` must be specified",
            });
            return;
          }

          if (!registrationId) {
            reply({
              reply: "unsubscribe",
              error: "`registrationId` must be specified",
            });
            return;
          }

          if (subscriptionMap[ws.uid][collection][registrationId]) {
            globalStream.removeListener(
              "change",
              subscriptionMap[ws.uid][collection][registrationId]
            );
            delete subscriptionMap[ws.uid][collection][registrationId];
          }

          reply({
            reply: "unsubscribe",
            payload: {
              collection,
              registrationId,
            },
          });
        }
      });

      ws.on("close", () => {
        for (const collection of Object.values(subscriptionMap[ws.uid] ?? {})) {
          for (const handler of Object.values(collection)) {
            globalStream.removeListener("change", handler);
          }
        }
        delete subscriptionMap[ws.uid];
      });

      ws.send("hermes");
    });

    console.log(`hermes: server running at ws://localhost:${port}`);
  } catch (e) {
    console.error(`hermes: error: ${e}`);
  }
};

const getChangeStreamHandler = (
  server,
  dbCollection,
  uid,
  registrationId,
  pipeline
) => {
  const send = (message) => {
    const ws = Array.from(server.clients).find(
      (ws: WebSocketWithUid) => ws.uid === uid
    ) as WebSocketWithUid;

    if (ws) ws.send(JSON.stringify(message));
  };

  return async (event) => {
    const { coll } = event.ns;

    const message: DataReply = {
      reply: "data",
      payload: {
        coll,
        registrationId,
      },
    };

    if (event.operationType === "insert" || event.operationType === "update") {
      if (pipeline.length) {
        const scopedPipeline = [
          {
            $match: {
              _id: event.documentKey._id,
            },
          },
          ...pipeline,
        ];

        const [matchedDocument] = await dbCollection
          .aggregate(scopedPipeline)
          .toArray();

        if (!matchedDocument) {
          message.payload.operation = "delete";
          message.payload.deleteData = [
            { _id: event.documentKey._id.toString(), registrationId },
          ];
          send(message);
          return;
        }
      }

      message.payload.operation = "insert";
      message.payload.insertData = [event.fullDocument];
    }

    if (event.operationType === "delete") {
      message.payload.operation = "delete";
      message.payload.deleteData = [{ _id: event.documentKey._id.toString() }];
    }

    send(message);
  };
};
