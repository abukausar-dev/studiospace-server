import { ObjectId } from "mongodb";
import { db } from "../config/database.js";

// Helper: Calculate end time from start time and hours
const calculateTimeSlots = (dateStr, startTimeStr, durationHours) => {
    const [hours, minutes] = startTimeStr.split(":").map(Number);
    const startAt = new Date(`${dateStr}T${startTimeStr}:00`);
    const endAt = new Date(startAt.getTime() + durationHours * 60 * 60 * 1000);
    return { startAt, endAt };
};

// 1. POST /api/bookings (Create Booking with Double-Booking Prevention)
export const createBooking = async (req, res) => {
    try {
        const { studioId, date, startTime, hours } = req.body;

        if (!studioId || !date || !startTime || !hours) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: studioId, date, startTime, hours",
            });
        }

        if (!ObjectId.isValid(studioId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Studio ID format",
            });
        }

        const studio = await db.collection("studios").findOne({ _id: new ObjectId(studioId) });
        if (!studio) {
            return res.status(404).json({
                success: false,
                message: "Workspace not found",
            });
        }

        // Rule: Host cannot book their own studio
        if (studio.ownerEmail === req.user.email) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You cannot book your own studio listing",
            });
        }

        const duration = Number(hours);
        if (isNaN(duration) || duration < 1 || duration > 12) {
            return res.status(400).json({
                success: false,
                message: "Booking duration must be between 1 and 12 whole hours",
            });
        }

        const { startAt, endAt } = calculateTimeSlots(date, startTime, duration);

        // Rule: Booking slot must be in the future
        if (startAt.getTime() <= Date.now()) {
            return res.status(400).json({
                success: false,
                message: "Booking date and time must be in the future",
            });
        }

        // CHALLENGE 2: Double-Booking Overlap Prevention
        // Check against active bookings ("Confirmed" OR "Pending"). 
        // Excludes "Cancelled" slots.
        // Overlap Formula: existing.startAt < new.endAt AND existing.endAt > new.startAt
        const conflictingBooking = await db.collection("bookings").findOne({
            studioId: { $in: [studio._id.toString(), studio._id] },
            status: { $in: ["Confirmed", "Pending"] },
            startAt: { $lt: endAt },
            endAt: { $gt: startAt },
        });

        if (conflictingBooking) {
            return res.status(409).json({
                success: false,
                message: "This workspace is already reserved for the selected time window. Please select another slot.",
            });
        }

        // Snapshot pricing
        const hourlyRateSnapshot = studio.hourlyRate || 0;
        const securityDepositSnapshot = studio.securityDeposit || 0;
        const totalAmount = hourlyRateSnapshot * duration + securityDepositSnapshot;

        const newBooking = {
            studioId: studio._id.toString(),
            studioTitle: studio.title,
            studioImage: studio.imageUrl || "",
            location: studio.location,
            creatorId: req.user.id || req.user._id,
            creatorEmail: req.user.email,
            creatorName: req.user.name || "Creator",
            hostEmail: studio.ownerEmail,
            date,
            startTime,
            startAt,
            endAt,
            hours: duration,
            hourlyRateSnapshot,
            securityDepositSnapshot,
            totalAmount,
            status: "Pending", // Default initial status
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection("bookings").insertOne(newBooking);

        return res.status(201).json({
            success: true,
            message: "Studio slot reserved successfully with Pending status",
            data: { ...newBooking, _id: result.insertedId },
        });
    } catch (error) {
        console.error("Error in createBooking:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while processing booking",
        });
    }
};

// 2. GET /api/bookings/me (Creator: Fetch logged in user's reservations)
export const getMyBookings = async (req, res) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const bookings = await db
            .collection("bookings")
            .find({ creatorEmail: userEmail })
            .sort({ createdAt: -1 })
            .toArray();

        return res.status(200).json({
            success: true,
            data: bookings,
        });
    } catch (error) {
        console.error("Error in getMyBookings:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch reservations",
        });
    }
};

// 3. PATCH /api/bookings/:id/cancel (Creator: Cancel Pending reservation)
export const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(404).json({ success: false, message: "Invalid Booking ID" });
        }

        const booking = await db.collection("bookings").findOne({ _id: new ObjectId(id) });
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking record not found" });
        }

        // Ownership Check
        if (booking.creatorEmail !== req.user.email) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to cancel this booking",
            });
        }

        // Only Pending bookings can be cancelled by creator
        if (booking.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel booking with current status: ${booking.status}`,
            });
        }

        await db.collection("bookings").updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: "Cancelled", updatedAt: new Date() } }
        );

        return res.status(200).json({
            success: true,
            message: "Booking reservation cancelled successfully",
        });
    } catch (error) {
        console.error("Error in cancelBooking:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to cancel booking",
        });
    }
};