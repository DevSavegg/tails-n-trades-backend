// src/modules/auth/lib/auth-client.ts

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import Redis from 'ioredis';
import { admin } from 'better-auth/plugins';
import { db } from '../../../shared/db/index_db';
import * as authSchema from '../models/schema';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const baseAdapter = drizzleAdapter(db, {
  provider: 'pg',
  schema: {
    user: authSchema.user,
    session: authSchema.session,
    account: authSchema.account,
    verification: authSchema.verification,
  },
});

export const auth = betterAuth({
  baseURL: 'http://localhost:3000/api/auth',
  trustedOrigins: ['http://localhost:8080'],

  database: baseAdapter,

  user: {
    additionalFields: {
      roles: {
        type: 'string[]',
        required: false,
        defaultValue: ['customer'],
        input: false,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
  },

  secondaryStorage: {
    get: async (key) => {
      const value = await redis.get(key);
      return value ? value : null;
    },
    set: async (key, value, ttl) => {
      if (ttl) {
        await redis.set(key, value, 'EX', ttl);
      } else {
        await redis.set(key, value);
      }
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },

  plugins: [
    // admin({
    //   defaultRole: 'customer',
    //   adminRole: 'admin',
    // }),
  ],
});
