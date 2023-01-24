import { Document } from "mongodb";

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
  registrationId: string;
  query?: object[];
};

type PUnsubscribe = {
  collection: string;
  registrationId: string;
  id: string;
};

export type DataReply = {
  reply: "data";
  payload: PDataReply;
};

export type PDataReply = {
  coll: string;
  registrationId: string;
  operation?: "insert" | "delete";
  insertData?: Document[];
  deleteData?: { _id: string; registrationId?: string }[];
};
