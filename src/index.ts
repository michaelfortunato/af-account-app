/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import { S3Client } from "@aws-sdk/client-s3";
import express from "express";
import { MongoClient } from "mongodb";
import {
  mongoConnectionString,
  accountAppPort,
  mongoAccountDB,
  s3AccessKeyId,
  s3SecretAccessKey
} from "./secrets";
import uploadImage from "./posts/uploadImage";

const app = express();

app.locals.S3Client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: s3AccessKeyId,
    secretAccessKey: s3SecretAccessKey
  }
});
app.locals.S3Uploads = {};

// "rc-chart-redis-master" //"rc-chart-redis-master.default.svc.cluster.local"
async function connectToMongoDB() {
  const mongoDBClient = await new MongoClient(mongoConnectionString).connect();

  app.locals.database = mongoDBClient.db(mongoAccountDB);
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
    console.log("Connected to database! 🦄");
    app.use(express.json());
    app.use("/account", uploadImage);
    // app.use("/studio", studio);
    app.listen(accountAppPort, () =>
      console.log(`Listening on port ${accountAppPort}`)
    );
  } catch (error) {
    console.log(error);
    console.log("Could not start auth service");
  }
}
main();
