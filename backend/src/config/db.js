import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function normalizeLegacyMongoData(connection) {
  const db = connection.connection.db;
  const users = db.collection("users");
  const tasks = db.collection("tasks");

  const [adminRoles, userRoles, pendingTasks, inProgressTasks, pendingReviewTasks, completedTasks, rejectedTasks] =
    await Promise.all([
      users.updateMany({ role: "admin" }, { $set: { role: "ADMIN" } }),
      users.updateMany({ role: "user" }, { $set: { role: "USER" } }),
      tasks.updateMany({ status: "Pending" }, { $set: { status: "PENDING" } }),
      tasks.updateMany({ status: "In Progress" }, { $set: { status: "IN_PROGRESS" } }),
      tasks.updateMany({ status: "Pending Review" }, { $set: { status: "PENDING_REVIEW" } }),
      tasks.updateMany({ status: "Completed" }, { $set: { status: "COMPLETED" } }),
      tasks.updateMany({ status: "Rejected" }, { $set: { status: "REJECTED" } }),
    ]);

  const modifiedCount =
    adminRoles.modifiedCount +
    userRoles.modifiedCount +
    pendingTasks.modifiedCount +
    inProgressTasks.modifiedCount +
    pendingReviewTasks.modifiedCount +
    completedTasks.modifiedCount +
    rejectedTasks.modifiedCount;

  if (modifiedCount > 0) {
    console.log(`Normalized ${modifiedCount} legacy MongoDB enum value(s) for Prisma compatibility`);
  }

  const legacyTasks = await tasks
    .find({
      $and: [
        { $or: [{ userId: { $exists: false } }, { userId: null }] },
        { $or: [{ assignedTo: { $exists: true, $ne: null } }, { createdBy: { $exists: true, $ne: null } }] },
      ],
    })
    .project({ assignedTo: 1, createdBy: 1 })
    .toArray();

  let repairedTaskCount = 0;

  for (const task of legacyTasks) {
    const normalizedUserId = task.assignedTo || task.createdBy;

    if (!normalizedUserId) {
      continue;
    }

    await tasks.updateOne(
      { _id: task._id },
      { $set: { userId: normalizedUserId } },
    );
    repairedTaskCount += 1;
  }

  if (repairedTaskCount > 0) {
    console.log(`Backfilled userId for ${repairedTaskCount} legacy task record(s)`);
  }
}

export default async function connectDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    mongoose.set("strictQuery", true);
    cached.promise = mongoose.connect(databaseUrl).then(async (mongooseInstance) => {
      console.log("Connected to MongoDB via Mongoose");
      await normalizeLegacyMongoData(mongooseInstance);
      return mongooseInstance;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
