import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", function (req, res) {
    res.json({ success: true, message: "StudioSpace API is running" });
});

// if no route matches, this middleware will handle the 404 error
app.use(function (req, res) {
    res.status(404).json({ success: false, message: "Route not found" });
});

// if an unexpected error occurs, this middleware will handle it
app.use(function (err, req, res, next) {
    console.log(err);
    res.status(500).json({ success: false, message: "Something went wrong on the server" });
});

export default app;