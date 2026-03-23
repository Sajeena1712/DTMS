import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ override: true });

const mongoHost = process.env.MONGO_RS_HOST || "127.0.0.1:27018";
const replicaSetName = process.env.MONGO_RS_NAME || "rs0";
const adminUri = `mongodb://${mongoHost}/admin?directConnection=true`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPrimary(connection, attempts = 20, delayMs = 1000) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const status = await connection.db.admin().command({ replSetGetStatus: 1 });
      const primaryMember = status.members?.find((member) => member.stateStr === "PRIMARY");

      if (status.ok === 1 && primaryMember) {
        console.log(`Replica set ${replicaSetName} is PRIMARY on ${primaryMember.name}`);
        return;
      }
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
    }

    await sleep(delayMs);
  }

  throw new Error(`Replica set ${replicaSetName} did not become PRIMARY in time`);
}

async function initReplicaSet() {
  try {
    const mongooseInstance = await mongoose.connect(adminUri);
    const connection = mongooseInstance.connection;
    const admin = connection.db.admin();

    try {
      const status = await admin.command({ replSetGetStatus: 1 });
      const members = status.members?.map((member) => member.name).join(", ") || "unknown members";
      console.log(`Replica set ${replicaSetName} is already configured: ${members}`);
    } catch (error) {
      const codeName = error?.codeName || "";
      const message = error?.message || "";
      const notInitialized =
        codeName === "NotYetInitialized" ||
        message.includes("not yet initialized") ||
        message.includes("no replset config has been received");

      if (!notInitialized) {
        throw error;
      }

      console.log(`Initializing replica set ${replicaSetName} on ${mongoHost}`);
      await admin.command({
        replSetInitiate: {
          _id: replicaSetName,
          members: [{ _id: 0, host: mongoHost }],
        },
      });
    }

    await waitForPrimary(connection);
    console.log("Replica set initialization complete");
  } catch (error) {
    console.error("Failed to initialize replica set");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

initReplicaSet();
