import { Document, UpdateDescription } from "mongodb";

export type Message<
  P = Payload,
  T extends keyof P = keyof P
> = T extends keyof P ? MessageMap<P, T> : never;

type Payload = {
  identify: PIdentify;
  subscribe: PSubscribe;
  unsubscribe: PUnsubscribe;
};

type MessageMap<P, T extends keyof P = keyof P> = {
  type: T;
  payload: P[T];
};

type PIdentify = {
  id: string;
};

type PSubscribe = {
  collection: string;
};

type PUnsubscribe = {
  collection: string;
  id: string;
};

export type DataReply = {
  reply: "data";
  payload: PDataReply;
};

export type PDataReply = {
  coll: string;
  operation: "insert" | "delete" | "update";
  insertData?: Document[];
  deleteData?: string[];
  updateData?: { _id: string; updateDescription: UpdateDescription }[];
};
