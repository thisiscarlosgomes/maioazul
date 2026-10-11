import { MongoClient, type MongoClientOptions } from "mongodb";

const options: MongoClientOptions = {
  serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 3000),
  connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 3000),
  socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS || 10000),
};

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

const clientPromise: PromiseLike<MongoClient> = {
  then(onFulfilled, onRejected) {
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

export default clientPromise;
