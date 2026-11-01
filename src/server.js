import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/database.js";

const port = process.env.PORT || 5000;

async function startServer() {
    try {
        await connectDB();
        app.listen(port, function () {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.log("Could not start server:", error.message);
        process.exit(1);
    }
}

startServer();