import "dotenv/config";
import { ObjectId } from "mongodb";
import { db } from "./config/database.js";
import { auth } from "./config/auth.js";
import { users, studios, reviewComments, ratingPool, makeGallery } from "./seedData.js";

const daysAgo = (days) => {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
};

const createUser = async (user) => {
    try {
        const result = await auth.api.signUpEmail({
            body: {
                name: user.name,
                email: user.email,
                password: user.password,
                image: user.image,
            },
        });
        return result.user.id;
    } catch (error) {
        const existing = await db.collection("user").findOne({ email: user.email });
        if (existing) {
            return existing._id.toString();
        }
        throw error;
    }
};

const seed = async () => {
    console.log("Seeding started...");

    const userIds = [];
    for (const user of users) {
        const id = await createUser(user);
        userIds.push(id);
    }
    console.log("Users ready: " + userIds.length);

    await db.collection("studios").deleteMany({});
    await db.collection("reviews").deleteMany({});
    await db.collection("bookings").deleteMany({});

    const studioDocs = [];
    const reviewDocs = [];

    for (let i = 0; i < studios.length; i++) {
        const item = studios[i];
        const owner = users[item.ownerIndex];
        const ownerId = userIds[item.ownerIndex];
        const studioId = new ObjectId();

        const reviewerIndexes = [
            (item.ownerIndex + 1) % users.length,
            (item.ownerIndex + 2) % users.length,
        ];

        let ratingTotal = 0;

        for (let r = 0; r < 2; r++) {
            const reviewerIndex = reviewerIndexes[r];
            const position = i * 2 + r;
            const rating = ratingPool[position % ratingPool.length];
            ratingTotal = ratingTotal + rating;

            reviewDocs.push({
                studioId: studioId.toString(),
                reviewerId: userIds[reviewerIndex],
                reviewerName: users[reviewerIndex].name,
                reviewerImage: users[reviewerIndex].image,
                rating: rating,
                comment: reviewComments[position % reviewComments.length],
                createdAt: daysAgo(3 + ((position * 4) % 50)),
            });
        }

        const gallery = makeGallery(item.category, item.photoStart);

        studioDocs.push({
            _id: studioId,
            title: item.title,
            category: item.category,
            hourlyRate: item.hourlyRate,
            securityDeposit: item.securityDeposit,
            maxCapacity: item.maxCapacity,
            location: item.location,
            imageUrl: gallery[0],
            gallery: gallery,
            amenities: item.amenities,
            overview: item.overview,
            ownerId: ownerId,
            ownerEmail: owner.email,
            ownerName: owner.name,
            ownerImage: owner.image,
            rating: Math.round((ratingTotal / 2) * 10) / 10,
            reviewCount: 2,
            createdAt: daysAgo(item.daysOld),
            updatedAt: daysAgo(item.daysOld),
        });
    }

    await db.collection("studios").insertMany(studioDocs);
    await db.collection("reviews").insertMany(reviewDocs);

    await db.collection("studios").createIndex({ category: 1, hourlyRate: 1 });
    await db.collection("studios").createIndex({ rating: -1, createdAt: -1 });
    await db.collection("studios").createIndex({ ownerEmail: 1 });
    await db.collection("reviews").createIndex({ studioId: 1, createdAt: -1 });

    console.log("Studios inserted: " + studioDocs.length);
    console.log("Reviews inserted: " + reviewDocs.length);
    console.log("Examiner login: examiner@example.com / Examiner123");
    console.log("Done.");
};

seed()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log("Seed failed:", error);
        process.exit(1);
    });