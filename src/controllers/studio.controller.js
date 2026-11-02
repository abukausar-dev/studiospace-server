import { ObjectId } from "mongodb";
import { db } from "../config/database.js";

const escapeRegex = (text) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getStudios = async (req, res) => {
    const search = req.query.search;
    const category = req.query.category;
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    const sort = req.query.sort;

    let page = Number(req.query.page) || 1;
    let limit = Number(req.query.limit) || 9;
    if (page < 1) page = 1;
    if (limit < 1) limit = 9;
    if (limit > 24) limit = 24;

    const filter = {};

    if (search && typeof search === "string") {
        const safeSearch = escapeRegex(search);
        filter.$or = [
            { title: { $regex: safeSearch, $options: "i" } },
            { location: { $regex: safeSearch, $options: "i" } },
        ];
    }

    if (category && typeof category === "string") {
        filter.category = category;
    }

    if (minPrice || maxPrice) {
        filter.hourlyRate = {};
        if (minPrice) filter.hourlyRate.$gte = Number(minPrice);
        if (maxPrice) filter.hourlyRate.$lte = Number(maxPrice);
    }

    let sortOption = { createdAt: -1 };
    if (sort === "price-low") sortOption = { hourlyRate: 1 };
    if (sort === "price-high") sortOption = { hourlyRate: -1 };
    if (sort === "rating") sortOption = { rating: -1, createdAt: -1 };

    const studios = db.collection("studios");
    const total = await studios.countDocuments(filter);
    const skip = (page - 1) * limit;

    const data = await studios
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .toArray();

    res.json({
        success: true,
        data: data,
        pagination: {
            page: page,
            limit: limit,
            total: total,
            totalPages: Math.ceil(total / limit),
        },
    });
};

const getFeaturedStudios = async (req, res) => {
    const data = await db
        .collection("studios")
        .find({})
        .sort({ rating: -1, createdAt: -1 })
        .limit(6)
        .toArray();

    res.json({ success: true, data: data });
};

const getStudioById = async (req, res) => {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
        return res.status(404).json({ success: false, message: "Studio not found" });
    }

    const studio = await db.collection("studios").findOne({ _id: new ObjectId(id) });

    if (!studio) {
        return res.status(404).json({ success: false, message: "Studio not found" });
    }

    res.json({ success: true, data: studio });
};

const getStudioReviews = async (req, res) => {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
        return res.status(404).json({ success: false, message: "Studio not found" });
    }

    const reviews = await db
        .collection("reviews")
        .find({ studioId: id })
        .sort({ createdAt: -1 })
        .toArray();

    res.json({ success: true, data: reviews });
};

const getPlatformStats = async (req, res) => {
    const studios = await db.collection("studios").countDocuments();
    const bookings = await db.collection("bookings").countDocuments();
    const creators = await db.collection("user").countDocuments();

    res.json({ success: true, data: { studios, bookings, creators } });
};

export {
    getStudios,
    getFeaturedStudios,
    getStudioById,
    getStudioReviews,
    getPlatformStats,
};