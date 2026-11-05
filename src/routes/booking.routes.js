import express from "express";
import {
    createBooking,
    getMyBookings,
    cancelBooking,
} from "../controllers/booking.controller.js";
import {authenticate} from "../middleware/authenticate.js";

const router = express.Router();

// All booking routes require JWT authentication
router.post("/", authenticate, createBooking);
router.get("/me", authenticate, getMyBookings);
router.patch("/:id/cancel", authenticate, cancelBooking);

export default router;