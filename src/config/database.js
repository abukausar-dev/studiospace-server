import { MongoClient } from "mongodb";

let database;

async function connectDB() {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    database = client.db(process.env.DB_NAME);
    console.log("MongoDB connected");
}

function getDB() {
    return database;
}

export { connectDB, getDB };