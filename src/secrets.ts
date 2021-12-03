import fs from "fs";
import path from "path";
import YAML from "yaml";

const secretFolderPath = process.env.MOUNT_PATH
  ? path.join(
      process.env.MOUNT_PATH as string,
      process.env.SECRET_FOLDER_PATH as string
    )
  : (process.env.SECRET_FOLDER_PATH as string);

// Get database credentials
// Once I get telepresence set up I will reintroduce the commented out code
/* const clusterEndpoint =
  process.env.X_NODE_ENV !== "development"
    ? fs.readFileSync(
        path.join(secretFolderPath, "mongo-secrets", "cluster-endpoint"),
        { encoding: "utf-8" }
      )
    : process.env.MONGO_SERVICE_SERVICE_HOST;
*/

const clusterEndpoint = fs.readFileSync(
  path.join(secretFolderPath, "mongo-secrets", "cluster-endpoint"),
  { encoding: "utf-8" }
);

const clusterPort = fs.readFileSync(
  path.join(secretFolderPath, "mongo-secrets", "cluster-port"),
  { encoding: "utf-8" }
);

const replicasetName = fs.readFileSync(
  path.join(secretFolderPath, "mongo-secrets", "replicaset-name"),
  { encoding: "utf-8" }
);

// This large statement is a bug I need to fix with ExternalSecrets
// not decoding the base64, forcing us to do it here.
const databaseCredentials = YAML.parse(
  process.env.X_NODE_ENV !== "development"
    ? Buffer.from(
        fs.readFileSync(
          path.join(
            secretFolderPath,
            "mongo-secrets",
            "account-app-db-credentials"
          ),
          { encoding: "utf-8" }
        ),
        "base64"
      ).toString("ascii")
    : fs.readFileSync(
        path.join(
          secretFolderPath,
          "mongo-secrets",
          "account-app-db-credentials"
        ),
        { encoding: "utf-8" }
      )
) as {
  username: string;
  password: string;
  databases: { databaseName: string; databaseRole: string }[];
};

const { username: mongoUsername, password: mongoPassword } =
  databaseCredentials;

const mongoAccountDB = "accountDB";
// const { databaseName: MONGO_ACCOUNTS_DB } = databases.filter(
//   ({ databaseName }: { databaseName: string; databaseRole: string }) =>
//     databaseName === "accountDB"
// )[0];
//
const replicasetQueryParameter =
  replicasetName !== "" ? `&replicaSet=${replicasetName}` : "";

const mongoConnectionString =
  `mongodb://${mongoUsername}:${mongoPassword}@${clusterEndpoint}:${clusterPort}` +
  `/?authSource=admin${replicasetQueryParameter}&retryWrites=false`;

// s3 access keys for image uploads
const s3AccessKeyId = fs.readFileSync(
  path.join(secretFolderPath, "af-s3-secrets", "s3-aws-access-key-id"),
  { encoding: "utf-8" }
);
const s3SecretAccessKey = fs.readFileSync(
  path.join(secretFolderPath, "af-s3-secrets", "s3-aws-secret-access-key"),
  { encoding: "ascii" }
);

const accountAppPort = process.env.LOCAL_PORT
  ? process.env.LOCAL_PORT
  : process.env.ACCOUNT_APP_SERVICE_PORT;

export {
  mongoConnectionString,
  accountAppPort,
  mongoAccountDB,
  s3AccessKeyId,
  s3SecretAccessKey
};
