import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));

// Better Auth route handler before other routes, so that it can handle authentication requests
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
app.use(cookieParser());

app.get("/health", function (req, res) {
    res.json({ success: true, message: "StudioSpace API is running" });
});

// if no route matches, return a 404 error
app.use(function (req, res) {
    res.status(404).json({ success: false, message: "Route not found" });
});

// if an unexpected error occurs, return a 500 error
app.use(function (err, req, res, next) {
    console.log(err);
    res.status(500).json({ success: false, message: "Something went wrong on the server" });
});

export default app;