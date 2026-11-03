import { ObjectId } from "mongodb";
import { db } from "../config/database.js";

// Helper: Escape regex special characters to prevent regex injection
const escapeRegex = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

export const getStudios = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 9,
            search,
            category,
            minPrice,
            maxPrice,
            sort = "newest",
        } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(24, Math.max(1, parseInt(limit, 10) || 9));
        const skip = (pageNum - 1) * limitNum;

        const filter = {};

        // 1. Search by title or location (Case-insensitive)
        if (search && search.trim() !== "") {
            const searchRegex = new RegExp(escapeRegex(search.trim()), "i");
            filter.$or = [{ title: searchRegex }, { location: searchRegex }];
        }

        // 2. Category Filter (Exact slug match)
        if (category && category.trim() !== "" && category !== "all") {
            filter.category = category.trim();
        }

        // 3. Price Filter (Safely handles single or combined ranges)
        const hasMin = minPrice !== undefined && minPrice !== "" && !isNaN(Number(minPrice));
        const hasMax = maxPrice !== undefined && maxPrice !== "" && !isNaN(Number(maxPrice));

        if (hasMin && hasMax) {
            filter.hourlyRate = {
                $gte: Number(minPrice),
                $lte: Number(maxPrice),
            };
        } else if (hasMin) {
            filter.hourlyRate = { $gte: Number(minPrice) };
        } else if (hasMax) {
            filter.hourlyRate = { $lte: Number(maxPrice) };
        }

        // 4. Sorting logic
        let sortCriteria = { createdAt: -1 }; // default: newest
        if (sort === "price-low") {
            sortCriteria = { hourlyRate: 1 };
        } else if (sort === "price-high") {
            sortCriteria = { hourlyRate: -1 };
        } else if (sort === "rating") {
            sortCriteria = { rating: -1, reviewCount: -1 };
        }

        const total = await db.collection("studios").countDocuments(filter);
        const studios = await db
            .collection("studios")
            .find(filter)
            .sort(sortCriteria)
            .skip(skip)
            .limit(limitNum)
            .toArray();

        return res.status(200).json({
            success: true,
            data: studios,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
        });
    } catch (error) {
        console.error("Error in getStudios controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch studios",
            error: error.message,
        });
    }
};

export const getFeaturedStudios = async (req, res) => {
    try {
        const featured = await db
            .collection("studios")
            .find({})
            .sort({ rating: -1, createdAt: -1 })
            .limit(6)
            .toArray();

        return res.status(200).json({
            success: true,
            data: featured,
        });
    } catch (error) {
        console.error("Error in getFeaturedStudios:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch featured studios",
        });
    }
};

export const getStudioById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Studio not found (Invalid ID format)",
            });
        }

        const studio = await db.collection("studios").findOne({ _id: new ObjectId(id) });

        if (!studio) {
            return res.status(404).json({
                success: false,
                message: "Studio not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: studio,
        });
    } catch (error) {
        console.error("Error in getStudioById:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch studio details",
        });
    }
};

export const getStudioReviews = async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Invalid Studio ID",
            });
        }

        const reviews = await db
            .collection("reviews")
            .find({ studioId: id })
            .sort({ createdAt: -1 })
            .toArray();

        return res.status(200).json({
            success: true,
            data: reviews,
        });
    } catch (error) {
        console.error("Error in getStudioReviews:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch studio reviews",
        });
    }
};

export const getPlatformStats = async (req, res) => {
    try {
        const [studiosCount, bookingsCount, creatorsCount] = await Promise.all([
            db.collection("studios").countDocuments(),
            db.collection("bookings").countDocuments(),
            db.collection("user").countDocuments(),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                studios: studiosCount,
                bookings: bookingsCount,
                creators: creatorsCount,
            },
        });
    } catch (error) {
        console.error("Error in getPlatformStats:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch platform stats",
        });
    }
};