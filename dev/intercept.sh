# Make ./dev/predev.env.config available to pull-cluster-files and other subshells
export $(grep -v '^#' ./dev/predev.env.config | xargs)

# Pull secrets from local k8s and bring them into localhost
./dev/pull-cluster-files

# Use telepresence to intercept the pod
telepresence connect
telepresence uninstall --agent $DEV_APP
telepresence intercept $DEV_APP --port $LOCAL_PORT:$CLUSTER_PORT --mount=false \
  --env-file=.env

# Append the predev.env.config file to the .env file at the root of project
cat ./dev/predev.env.config >>./.env
npx ts-node-dev -r dotenv/config --respawn src/index.js
