import express from "express";
import {
    getStudios,
    getFeaturedStudios,
    getStudioById,
    getStudioReviews,
    getPlatformStats,
} from "../controllers/studio.controller.js";

const router = express.Router();

router.get("/", getStudios);
router.get("/featured", getFeaturedStudios);
router.get("/stats", getPlatformStats);
router.get("/:id", getStudioById);
router.get("/:id/reviews", getStudioReviews);

export default router;