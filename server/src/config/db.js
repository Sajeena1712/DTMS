import mongoose from "mongoose";

export default async function connectDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(databaseUrl);
}
