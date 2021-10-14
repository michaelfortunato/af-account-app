const express = require("express");
const { MongoClient } = require("mongodb");
const redis = require("redis");
const studio = require("./studio")
const { promisify } = require("util");

const app = express();
const port = process.env.NODE_ENV !== "development" ? 8080 : 8082;

// MongoDB connection string build
const MONGO_CLUSTER_ENDPOINT = process.env.MONGO_CLUSTER_ENDPOINT;
const MONGO_PORT = 27017;
const MONGO_USERNAME = process.env.MONGO_USERNAME;

const MONGO_PASSWORD = process.env.MONGO_PASSWORD;
const ACCOUNT_DB = process.env.MONGO_PRIMARY_DB;
const REPLICA_SET = process.env.REPLICA_SET;

// retryWrites being false is essential
const connectionString =
  process.env.NODE_ENV !== "development"
    ? `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_CLUSTER_ENDPOINT}:${MONGO_PORT}` +
      `/?authSource=admin&replicaSet=${REPLICA_SET}&retryWrites=false`
    : `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_CLUSTER_ENDPOINT}:${MONGO_PORT}` +
      `/?authSource=admin&retryWrites=false`;

// "rc-chart-redis-master" //"rc-chart-redis-master.default.svc.cluster.local"
const cache_master_url = process.env.REDIS_MASTER_HOST || "127.0.0.1";
const cache_master_port = process.env.REDIS_MASTER_PORT || 6379;
const cache_slave_url =
  process.env.REDIS_SLAVE_URL ||
  "rc-chart-redis-replicas.default.svc.cluster.local";
const cache_slave_port = process.env.REDIS_SLAVE_PORT || 6379;
const cache_password = "username";

const cache_retry = (options) => {
  if (options.error) {
    return new Error("Not retrying");
  }
};

function connectToRedis() {
  const redis_master_client = redis.createClient({
    host: cache_master_url,
    port: cache_master_port,
    password: cache_password,
    retry_strategy: cache_retry,
  });
  // Add event listeners
  redis_master_client.on("connect", () => {
    console.log("Successfully connected to cache");
    app.locals.master_cache_get = promisify(redis_master_client.get).bind(
      redis_master_client
    );
    app.locals.master_cache_set = promisify(redis_master_client.set).bind(
      redis_master_client
    );
  });
  redis_master_client.on("reconnecting", () => {
    console.log("reconnecting");
  });
  redis_master_client.on("error", () => {
    app.locals.redis_master_client = null;
    console.log("Could not connect to cache");
  });
}

async function connectToMongoDB() {
  console.log(connectionString);
  const mongodb_client = new MongoClient(connectionString, {
    useUnifiedTopology: true,
  });

  const connected_client = await mongodb_client.connect();
  console.log("Connected to database! 🦄");

  app.locals.database = connected_client.db(ACCOUNT_DB);

  /* make sure accounts and artworks collection are indexed by email*/
  app.locals.database
    .collection("accounts")
    .createIndex({ email: 1 }, { unique: true });
    app.locals.database
    .collection("artworks")
    .createIndex({ artist_email: 1, artwork_title: 1 }, { unique: true });
}

async function main() {
  try {
    await connectToMongoDB();
    app.use(express.json());
    app.use("/studio", studio);
    app.listen(port, () => console.log(`Listening on port ${port}`));
  } catch (error) {
    console.log(error);
    console.log("Could not start auth service");
  }
}
main();
