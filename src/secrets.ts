import fs from "fs";
import path from "path";
import YAML from "yaml";

const secretFolderPath = process.env.SECRET_FOLDER_PATH as string;
// Get database credentials

const clusterMetaData = YAML.parse(
  fs.readFileSync(
    path.join(secretFolderPath, "mongo-secrets", "meta-data.yaml"),
    { encoding: "utf-8" }
  )
);
const { clusterEndpoint, clusterPort, replicasetName } = clusterMetaData;

const databaseCredentials = YAML.parse(
  fs.readFileSync(
    path.join(secretFolderPath, "mongo-secrets", "authAppCredentials.yaml"),
    { encoding: "utf-8" }
  )
) as {
  username: string;
  password: string;
  databases: { databaseName: string; databaseRole: string }[];
};

const {
  username: MONGO_USERNAME,
  password: MONGO_PASSWORD,
  databases
} = databaseCredentials;

const { databaseName: MONGO_ACCOUNTS_DB } = databases.filter(
  ({ databaseName }: { databaseName: string; databaseRole: string }) =>
    databaseName === "accountDB"
)[0];

const REPLICA_SET_QUERY_PARAMETER =
  replicasetName !== "" ? `&replicaSet=${replicasetName}` : "";

export {
  clusterEndpoint as MONGO_CLUSTER_ENDPOINT,
  clusterPort as MONGO_PORT,
  MONGO_USERNAME,
  MONGO_PASSWORD,
  MONGO_ACCOUNTS_DB,
  REPLICA_SET_QUERY_PARAMETER
};
