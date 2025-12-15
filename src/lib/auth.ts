import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import Redis from 'ioredis';
import { admin } from 'better-auth/plugins';
import { db } from '../db/index_db';
import * as schema from '../db/schema';
import { logger } from '../lib/logger';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error(err, 'Redis connection error'));

export const auth = betterAuth({
  baseURL: 'http://localhost:3000/api/auth',
  trustedOrigins: ['http://localhost:8080'],

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
  },

  logger: {
    level: 'warn',
  },

  secondaryStorage: {
    get: async (key) => {
      logger.debug({ key }, 'Redis GET');
      const value = await redis.get(key);
      return value ? value : null;
    },
    set: async (key, value, ttl) => {
      logger.debug({ key, ttl }, 'Redis SET');
      if (ttl) {
        await redis.set(key, value, 'EX', ttl);
      } else {
        await redis.set(key, value);
      }
    },
    delete: async (key) => {
      logger.debug({ key }, 'Redis DEL');
      await redis.del(key);
    },
  },

  plugins: [admin()],
});
