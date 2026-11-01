import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { db } from "./database.js";

const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [process.env.CLIENT_ORIGIN],

    database: mongodbAdapter(db),

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 6,
        autoSignIn: false,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
    },

    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            if (ctx.path !== "/sign-up/email") {
                return;
            }

            const password = ctx.body?.password || "";

            if (!/[A-Z]/.test(password)) {
                throw new APIError("BAD_REQUEST", {
                    message: "Password must have an uppercase letter",
                });
            }

            if (!/[a-z]/.test(password)) {
                throw new APIError("BAD_REQUEST", {
                    message: "Password must have a lowercase letter",
                });
            }
        }),
    },
});

export { auth };