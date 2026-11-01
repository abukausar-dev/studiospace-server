import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db(process.env.DB_NAME);

async function connectDB() {
    await client.connect();
    console.log("MongoDB connected");
}

export { db, connectDB };