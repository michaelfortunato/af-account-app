/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import express from "express";
import { MongoClient } from "mongodb";
import {
  MONGO_USERNAME,
  MONGO_PASSWORD,
  MONGO_CLUSTER_ENDPOINT,
  MONGO_PORT,
  REPLICA_SET_QUERY_PARAMETER,
  MONGO_ACCOUNTS_DB
} from "./secrets";

import studio from "./studio";

const app = express();
const port = process.env.ACCOUNT_APP_SERVICE_SERVICE_PORT;

// MongoDB connection string build
// retryWrites being false is essential
const connectionString =
  `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_CLUSTER_ENDPOINT}:${MONGO_PORT}` +
  `/?authSource=admin${REPLICA_SET_QUERY_PARAMETER}&retryWrites=false`;

// "rc-chart-redis-master" //"rc-chart-redis-master.default.svc.cluster.local"

async function connectToMongoDB() {
  console.log(connectionString);
  const mongoDBClient = await new MongoClient(connectionString, {
    useUnifiedTopology: true
  }).connect();
  console.log("Connected to database! 🦄");

  app.locals.database = mongoDBClient.db(MONGO_ACCOUNTS_DB);

  /* make sure accounts and artworks collection are indexed by email */
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
