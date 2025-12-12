import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle"; 
import Redis from "ioredis";
import { admin } from "better-auth/plugins";
import { db } from "../db/index_db"; 
import * as schema from "../db/schema";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export const auth = betterAuth({
    baseURL: "http://localhost:3000/api/auth",
    trustedOrigins: ["http://localhost:8080"],

    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
        }
    }),

    emailAndPassword: {
        enabled: true
    },

    secondaryStorage: {
        get: async (key) => {
            const value = await redis.get(key);
            return value ? value : null;
        },
        set: async (key, value, ttl) => {
            if (ttl) {
                await redis.set(key, value, "EX", ttl);
            } else {
                await redis.set(key, value);
            }
        },
        delete: async (key) => {
            await redis.del(key);
        },
    },

    plugins: [
        admin()
    ]
});