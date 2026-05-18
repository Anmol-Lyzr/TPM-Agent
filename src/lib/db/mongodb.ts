import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME ?? "TPM";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClient(): MongoClient {
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  return new MongoClient(uri);
}

function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createClient().connect();
    }
    return global._mongoClientPromise;
  }
  return createClient().connect();
}

export function resetMongoClient(): void {
  if (process.env.NODE_ENV === "development") {
    global._mongoClientPromise = undefined;
  }
}

export async function getDb(): Promise<Db> {
  try {
    const client = await getClientPromise();
    return client.db(DB_NAME);
  } catch {
    resetMongoClient();
    const client = await createClient().connect();
    if (process.env.NODE_ENV === "development") {
      global._mongoClientPromise = Promise.resolve(client);
    }
    return client.db(DB_NAME);
  }
}
