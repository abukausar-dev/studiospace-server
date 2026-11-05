import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth.js";
import { authenticate } from "./middleware/authenticate.js";
import studioRoutes from "./routes/studio.routes.js";
import bookingRoutes from "./routes/booking.routes.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));

// BetterAuth before express.json() to ensure auth middleware runs before JSON parsing
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
app.use(cookieParser());

// health check
app.get("/health", function (req, res) {
    res.json({ success: true, message: "StudioSpace API is running" });
});

app.get("/api/me", authenticate, function (req, res) {
    res.json({ success: true, user: req.user });
});

// API Routes
app.use("/api/studios", studioRoutes);
app.use("/api/bookings", bookingRoutes);

// 404 handler
app.use(function (req, res) {
    res.status(404).json({ success: false, message: "Route not found" });
});

// global error handler
app.use(function (err, req, res, next) {
    console.log(err);
    res.status(500).json({ success: false, message: "Something went wrong on the server" });
});

export default app;