export type Message<
  P = Payload,
  T extends keyof P = keyof P
> = T extends keyof P ? MessageMap<P, T> : never;

type Payload = {
  identify: PIdentify;
  subscribe: PSubscribe;
  unsubscribe: PSubscribe;
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
