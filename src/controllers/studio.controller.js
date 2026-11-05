import { ObjectId } from "mongodb";
import { db } from "../config/database.js";

// Helper: Escape regex special characters
const escapeRegex = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

// 1. GET /api/studios (Search, Filter, Sort, Paginate)
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

        if (search && search.trim() !== "") {
            const searchRegex = new RegExp(escapeRegex(search.trim()), "i");
            filter.$or = [{ title: searchRegex }, { location: searchRegex }];
        }

        if (category && category.trim() !== "" && category !== "all") {
            filter.category = category.trim();
        }

        const hasMin = minPrice !== undefined && minPrice !== "" && !isNaN(Number(minPrice));
        const hasMax = maxPrice !== undefined && maxPrice !== "" && !isNaN(Number(maxPrice));

        if (hasMin && hasMax) {
            filter.hourlyRate = { $gte: Number(minPrice), $lte: Number(maxPrice) };
        } else if (hasMin) {
            filter.hourlyRate = { $gte: Number(minPrice) };
        } else if (hasMax) {
            filter.hourlyRate = { $lte: Number(maxPrice) };
        }

        let sortCriteria = { createdAt: -1 };
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
        console.error("Error in getStudios:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch studios" });
    }
};

// 2. GET /api/studios/featured
export const getFeaturedStudios = async (req, res) => {
    try {
        const featured = await db
            .collection("studios")
            .find({})
            .sort({ rating: -1, createdAt: -1 })
            .limit(6)
            .toArray();

        return res.status(200).json({ success: true, data: featured });
    } catch (error) {
        console.error("Error in getFeaturedStudios:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch featured studios" });
    }
};

// 3. GET /api/studios/stats
export const getPlatformStats = async (req, res) => {
    try {
        const [studiosCount, bookingsCount, creatorsCount] = await Promise.all([
            db.collection("studios").countDocuments(),
            db.collection("bookings").countDocuments(),
            db.collection("user").countDocuments(),
        ]);

        return res.status(200).json({
            success: true,
            data: { studios: studiosCount, bookings: bookingsCount, creators: creatorsCount },
        });
    } catch (error) {
        console.error("Error in getPlatformStats:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch platform stats" });
    }
};

// 4. GET /api/studios/mine (Private: Fetch logged in host's listings)
export const getMyStudios = async (req, res) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) {
            return res.status(401).json({ success: false, message: "Unauthorized: Missing user email" });
        }

        const studios = await db
            .collection("studios")
            .find({ ownerEmail: userEmail })
            .sort({ createdAt: -1 })
            .toArray();

        return res.status(200).json({ success: true, data: studios });
    } catch (error) {
        console.error("Error in getMyStudios:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch your listings" });
    }
};

// 5. GET /api/studios/:id
export const getStudioById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(404).json({ success: false, message: "Studio not found (Invalid ID)" });
        }

        const studio = await db.collection("studios").findOne({ _id: new ObjectId(id) });
        if (!studio) {
            return res.status(404).json({ success: false, message: "Studio not found" });
        }

        return res.status(200).json({ success: true, data: studio });
    } catch (error) {
        console.error("Error in getStudioById:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch studio details" });
    }
};

// 6. GET /api/studios/:id/reviews
export const getStudioReviews = async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(404).json({ success: false, message: "Invalid Studio ID" });
        }

        const reviews = await db
            .collection("reviews")
            .find({ studioId: id })
            .sort({ createdAt: -1 })
            .toArray();

        return res.status(200).json({ success: true, data: reviews });
    } catch (error) {
        console.error("Error in getStudioReviews:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch reviews" });
    }
};

// 7. POST /api/studios (Private: Create Studio)
export const createStudio = async (req, res) => {
    try {
        const {
            title,
            category,
            hourlyRate,
            securityDeposit,
            maxCapacity,
            location,
            imageUrl,
            gallery,
            amenities,
            overview,
        } = req.body;

        if (!title || !category || !hourlyRate || !location || !imageUrl) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields (title, category, hourlyRate, location, imageUrl)",
            });
        }

        const newStudio = {
            title: title.trim(),
            category: category.trim(),
            hourlyRate: Number(hourlyRate),
            securityDeposit: Number(securityDeposit) || 0,
            maxCapacity: Number(maxCapacity) || 1,
            location: location.trim(),
            imageUrl: imageUrl.trim(),
            gallery: Array.isArray(gallery) ? gallery : [],
            amenities: Array.isArray(amenities) ? amenities : [],
            overview: overview ? overview.trim() : "",
            ownerId: req.user.id || req.user._id,
            ownerEmail: req.user.email,
            ownerName: req.user.name || "StudioSpace Host",
            rating: 5.0,
            reviewCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection("studios").insertOne(newStudio);

        return res.status(201).json({
            success: true,
            message: "Studio listed successfully",
            data: { ...newStudio, _id: result.insertedId },
        });
    } catch (error) {
        console.error("Error in createStudio:", error);
        return res.status(500).json({ success: false, message: "Failed to create studio listing" });
    }
};

// 8. PATCH /api/studios/:id (Private: Update Studio with Ownership Verification)
export const updateStudio = async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(404).json({ success: false, message: "Studio not found (Invalid ID)" });
        }

        const studio = await db.collection("studios").findOne({ _id: new ObjectId(id) });
        if (!studio) {
            return res.status(404).json({ success: false, message: "Studio not found" });
        }

        // Ownership check: Only the creator of the listing can edit it
        if (studio.ownerEmail !== req.user.email) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to edit this studio listing",
            });
        }

        const {
            title,
            category,
            hourlyRate,
            securityDeposit,
            maxCapacity,
            location,
            imageUrl,
            gallery,
            amenities,
            overview,
        } = req.body;

        const updatedData = {
            ...(title && { title: title.trim() }),
            ...(category && { category: category.trim() }),
            ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
            ...(securityDeposit !== undefined && { securityDeposit: Number(securityDeposit) }),
            ...(maxCapacity !== undefined && { maxCapacity: Number(maxCapacity) }),
            ...(location && { location: location.trim() }),
            ...(imageUrl && { imageUrl: imageUrl.trim() }),
            ...(gallery && { gallery: Array.isArray(gallery) ? gallery : [] }),
            ...(amenities && { amenities: Array.isArray(amenities) ? amenities : [] }),
            ...(overview !== undefined && { overview: overview.trim() }),
            updatedAt: new Date(),
        };

        await db.collection("studios").updateOne({ _id: new ObjectId(id) }, { $set: updatedData });

        return res.status(200).json({
            success: true,
            message: "Studio listing updated successfully",
        });
    } catch (error) {
        console.error("Error in updateStudio:", error);
        return res.status(500).json({ success: false, message: "Failed to update studio listing" });
    }
};

// 9. DELETE /api/studios/:id (Private: Delete Studio with Ownership Verification)
export const deleteStudio = async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(404).json({ success: false, message: "Studio not found (Invalid ID)" });
        }

        const studio = await db.collection("studios").findOne({ _id: new ObjectId(id) });
        if (!studio) {
            return res.status(404).json({ success: false, message: "Studio not found" });
        }

        // Ownership check
        if (studio.ownerEmail !== req.user.email) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You cannot delete a listing you do not own",
            });
        }

        await db.collection("studios").deleteOne({ _id: new ObjectId(id) });

        return res.status(200).json({
            success: true,
            message: "Studio listing removed successfully",
        });
    } catch (error) {
        console.error("Error in deleteStudio:", error);
        return res.status(500).json({ success: false, message: "Failed to delete studio listing" });
    }
};