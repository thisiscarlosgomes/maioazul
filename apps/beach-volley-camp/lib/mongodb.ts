import { MongoClient, type MongoClientOptions } from "mongodb";

const options: MongoClientOptions = {};

type MongoCache = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

function mongoUri(): string | null {
  const uri = process.env.MONGODB_URI?.trim();
  return uri ? uri : null;
}

export async function getMongoClient(): Promise<MongoClient | null> {
  const uri = mongoUri();
  if (!uri) return null;

  const cache = globalThis as MongoCache;
  if (!cache._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    const pending = client.connect();
    cache._mongoClientPromise = pending;
    pending.catch(() => {
      if (cache._mongoClientPromise === pending) {
        cache._mongoClientPromise = undefined;
      }
    });
  }

  return cache._mongoClientPromise;
}

const clientPromise = {
  then(
    onFulfilled?: ((value: MongoClient) => unknown) | null,
    onRejected?: ((reason: unknown) => unknown) | null,
  ) {
    return getMongoClient()
      .then((client) => {
        if (!client) {
          throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
        }
        return client;
      })
      .then(onFulfilled, onRejected);
  },
};

export default clientPromise as Promise<MongoClient>;
