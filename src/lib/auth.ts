import { betterAuth } from "better-auth";
import { Pool } from "pg";
import Redis from "ioredis";
import { Kysely, PostgresDialect } from "kysely";
import { admin } from "better-auth/plugins";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = new Kysely({
  dialect: new PostgresDialect({
    pool,
  }),
});

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export const auth = betterAuth({
    baseURL: "http://localhost:3000/api/auth",

    trustedOrigins: ["http://localhost:8080"],

    database: pool,

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