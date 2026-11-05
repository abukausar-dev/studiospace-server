import express from "express";
import {
    getStudios,
    getFeaturedStudios,
    getPlatformStats,
    getStudioById,
    getStudioReviews,
    createStudio,
    getMyStudios,
    updateStudio,
    deleteStudio,
} from "../controllers/studio.controller.js";
import {authenticate} from "../middleware/authenticate.js";

const router = express.Router();

// Public routes
router.get("/", getStudios);
router.get("/featured", getFeaturedStudios);
router.get("/stats", getPlatformStats);

// Private route: Must be defined before /:id to prevent route clash
router.get("/mine", authenticate, getMyStudios);

router.get("/:id", getStudioById);
router.get("/:id/reviews", getStudioReviews);

// Protected mutation routes (Challenge 1: JWT Authenticated)
router.post("/", authenticate, createStudio);
router.patch("/:id", authenticate, updateStudio);
router.delete("/:id", authenticate, deleteStudio);

export default router;