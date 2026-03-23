# Local MongoDB Fix

If Prisma fails with a server selection timeout mentioning `replicaSet name "rs0" does not match actual name <none>`, the local MongoDB instance was started with `--replSet rs0` but has not been initialized yet.

## Current local setup
1. The repo's local MongoDB instance is listening on `127.0.0.1:27018`
2. The server expects the replica set name `rs0`
3. Local server env should point to `mongodb://127.0.0.1:27018/dTMS?replicaSet=rs0`

## Recovery
1. Run `cd server && npm run mongo:init-rs`
2. Restart the API server with `npm start`
3. Retry `GET /api/auth/me` or `GET /api/tasks`

If `mongod` is not running yet, start the local MongoDB instance with `--replSet rs0` first, then run the init script.
