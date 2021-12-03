# Make ./dev/predev.env.config available to pull-cluster-files and other subshells
export $(grep -v '^#' ./dev/predev.env.config | xargs)

# ./dev/pull-cluster-files

# Append the predev.env.config file to the .env file at the root of project
cat ./dev/predev.env.config >>./.env

npx ts-node-dev -r dotenv/config --respawn src/index.ts
