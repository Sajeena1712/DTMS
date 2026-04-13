import fs from "fs";
import net from "net";
import path from "path";
import { spawn } from "child_process";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ override: true });

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
const DEFAULT_PORT = 27018;
const DEFAULT_REPLICA_SET = process.env.MONGO_RS_NAME || "rs0";
const SERVER_DIR = process.cwd();
const PROJECT_ROOT = path.resolve(SERVER_DIR, "..");
const MONGO_DIR = path.join(PROJECT_ROOT, "mongo-rs");
const DB_PATH = path.join(MONGO_DIR, "data");
const LOG_PATH = path.join(MONGO_DIR, "log", "mongod.log");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLocalMongoUrl(databaseUrl) {
  if (!databaseUrl) {
    return false;
  }

  try {
    const parsed = new URL(databaseUrl);
    return parsed.protocol.startsWith("mongodb") && LOCAL_HOSTS.has(parsed.hostname) && Number(parsed.port || DEFAULT_PORT) === DEFAULT_PORT;
  } catch {
    return false;
  }
}

function parseMongoUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return {
    hostname: parsed.hostname,
    port: Number(parsed.port || DEFAULT_PORT),
  };
}

function canConnect(hostname, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: hostname, port });
    let settled = false;

    const finish = (result) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function waitForPort(hostname, port, attempts = 20, delayMs = 1000) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (await canConnect(hostname, port)) {
      return;
    }

    await sleep(delayMs);
  }

  throw new Error(`MongoDB did not open ${hostname}:${port} in time`);
}

function resolveMongodBinary() {
  const candidates = [];

  if (process.platform === "win32") {
    candidates.push(
      "C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe",
      "C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe",
      "C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe",
    );
  }

  candidates.push("mongod");

  return candidates.find((candidate) => candidate === "mongod" || fs.existsSync(candidate)) || null;
}

function startMongod(hostname, port) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.mkdirSync(DB_PATH, { recursive: true });

  const mongodBinary = resolveMongodBinary();
  if (!mongodBinary) {
    throw new Error("Could not find mongod. Install MongoDB Server or add mongod to PATH.");
  }

  const args = [
    "--replSet",
    DEFAULT_REPLICA_SET,
    "--port",
    String(port),
    "--bind_ip",
    hostname,
    "--dbpath",
    DB_PATH,
    "--logpath",
    LOG_PATH,
    "--logappend",
  ];

  const child = spawn(mongodBinary, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });

  child.unref();
  console.log(`Started local mongod (${child.pid ?? "unknown pid"}) on ${hostname}:${port}`);
}

async function ensureReplicaSet(hostname, port) {
  const adminUri = `mongodb://${hostname}:${port}/admin?directConnection=true`;
  const connection = await mongoose.connect(adminUri, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    const admin = connection.connection.db.admin();

    try {
      const status = await admin.command({ replSetGetStatus: 1 });
      const primaryMember = status.members?.find((member) => member.stateStr === "PRIMARY");

      if (primaryMember) {
        console.log(`Replica set ${DEFAULT_REPLICA_SET} already has PRIMARY ${primaryMember.name}`);
        return;
      }
    } catch (error) {
      const message = error?.message || "";
      const codeName = error?.codeName || "";
      const notInitialized =
        codeName === "NotYetInitialized" ||
        message.includes("not yet initialized") ||
        message.includes("no replset config has been received");

      if (!notInitialized) {
        throw error;
      }

      console.log(`Initializing replica set ${DEFAULT_REPLICA_SET} on ${hostname}:${port}`);
      await admin.command({
        replSetInitiate: {
          _id: DEFAULT_REPLICA_SET,
          members: [{ _id: 0, host: `${hostname}:${port}` }],
        },
      });
    }

    for (let attempt = 1; attempt <= 20; attempt += 1) {
      try {
        const status = await admin.command({ replSetGetStatus: 1 });
        const primaryMember = status.members?.find((member) => member.stateStr === "PRIMARY");

        if (primaryMember) {
          console.log(`Replica set ${DEFAULT_REPLICA_SET} is PRIMARY on ${primaryMember.name}`);
          return;
        }
      } catch {
        // Mongo may need a moment right after replSetInitiate.
      }

      await sleep(1000);
    }

    throw new Error(`Replica set ${DEFAULT_REPLICA_SET} did not become PRIMARY in time`);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

async function ensureLocalMongo() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!isLocalMongoUrl(databaseUrl)) {
    return;
  }

  const { hostname, port } = parseMongoUrl(databaseUrl);

  if (!(await canConnect(hostname, port))) {
    startMongod(hostname, port);
    await waitForPort(hostname, port);
  } else {
    console.log(`Local MongoDB already reachable on ${hostname}:${port}`);
  }

  await ensureReplicaSet(hostname, port);
}

ensureLocalMongo().catch((error) => {
  console.error("Failed to prepare local MongoDB for development");
  console.error(error);
  process.exit(1);
});
