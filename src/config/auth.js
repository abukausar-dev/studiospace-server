import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { createAuthMiddleware, APIError } from "better-auth/api";
import jwt from "jsonwebtoken";
import { db } from "./database.js";

const JWT_COOKIE_NAME = "studio_access";
const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;
const isSecure = process.env.BETTER_AUTH_URL.startsWith("https");

const makeCookieOptions = (maxAge) => ({
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: maxAge,
});

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

        after: createAuthMiddleware(async (ctx) => {
            const newSession = ctx.context.newSession;

            if (newSession) {
                const user = newSession.user;

                const token = jwt.sign(
                    { id: user.id, name: user.name, email: user.email },
                    process.env.JWT_SECRET,
                    { expiresIn: "7d" }
                );

                ctx.setCookie(JWT_COOKIE_NAME, token, makeCookieOptions(SEVEN_DAYS_IN_SECONDS));
            }

            if (ctx.path === "/sign-out") {
                ctx.setCookie(JWT_COOKIE_NAME, "", makeCookieOptions(0));
            }
        }),
    },
});

export { auth };