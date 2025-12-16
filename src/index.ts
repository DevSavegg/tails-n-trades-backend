import { join } from 'path';
// src/index.ts

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { logger } from './shared/lib/logger';
import { staticPlugin } from '@elysiajs/static';

// Controllers
import { authController } from './modules/auth/controllers/auth.controller';
import { userController } from './modules/users/controllers/users.controller';
import { catalogController } from './modules/catalog/controllers/catalog.controller';
import { caretakingController } from './modules/caretaking/controllers/caretaking.controller';
import { salesController } from './modules/sales/controllers/sales.controller';
import { communityController } from './modules/community/controllers/community.controller';
import { favoritesController } from './modules/favorites/controllers/favorites.controller';

// Main Application
const app = new Elysia()
  // --- Global Logger Middleware ---
  .onRequest(({ request }) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
      },
      'Incoming Request'
    );
  })
  .onError(({ error, request }) => {
    logger.error(
      {
        err: error,
        method: request.method,
        url: request.url,
      },
      'Request Failed'
    );
  })
  .derive(() => ({ logger }))

  // Ensure uploads directory exists
  .onStart(async () => {
    const uploadDir = join(process.cwd(), 'uploads');
    const fs = await import('node:fs/promises');
    await fs.mkdir(uploadDir, { recursive: true });
  })

  // --- CORS ---
  .use(
    cors({
      origin: true,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    })
  )
  // --- Manual Static File Serving to bypass staticPlugin issues ---
  .get('/uploads/*', async ({ params, set }) => {
    const pathPart = params['*'];
    const file = Bun.file(join(process.cwd(), 'uploads', pathPart));

    const exists = await file.exists();
    if (!exists) {
      set.status = 404;
      return { error: 'File not found' };
    }

    set.headers['Access-Control-Allow-Origin'] = '*';
    set.headers['Cache-Control'] = 'public, max-age=86400';
    return file;
  })

  // --- API Group ---
  .group('/api', (app) =>
    app
      // --- Swagger Documentation ---
      .use(
        swagger({
          path: '/docs',
          documentation: {
            info: {
              title: 'Tails and Trades Backend API',
              version: '1.0.0',
              description: 'API documentation for the Tails and Trades backend server.',
            },
            servers: [{ url: '/api', description: 'Main API' }],
            tags: [
              { name: 'Users', description: 'User profile and management' },
              { name: 'Pets', description: 'Catalog operations (Search, Create, View)' },
              { name: 'Auth', description: 'User authentication (Better Auth)' },
              { name: 'Orders', description: 'Marketplace transactions' },
              { name: 'Community', description: 'Community posts and discussions' },
              { name: 'Caretaking', description: 'Pet caretaking services' },
            ],
            components: {
              securitySchemes: {
                cookieAuth: {
                  type: 'apiKey',
                  in: 'cookie',
                  name: 'better-auth.session_token',
                },
              },
            },
          },
        })
      )

      // --- Controllers ---
      .use(authController)
      .use(userController)
      .use(catalogController)
      .use(caretakingController)
      .use(salesController)
      .use(communityController)
      .use(favoritesController)
      .get('/debug-files', async () => {
        const fs = await import('node:fs/promises');
        const join = (await import('path')).join;
        try {
          const cwd = process.cwd();
          const uploadDir = join(cwd, 'uploads', 'profiles');
          const files = await fs.readdir(uploadDir);
          return {
            cwd,
            uploadDir,
            files,
            exists: true,
          };
        } catch (e: any) {
          return { error: e.message, code: e.code, stack: e.stack };
        }
      })
  );

app.listen(3000, () => {
  logger.info('Server is running on http://localhost:3000');
});

export type AppType = typeof app;

console.log(
  `🦊 Tails and Trades backend server running at ${app.server?.hostname}:${app.server?.port}`
);
console.log(
  `📚 Swagger Documentation at http://${app.server?.hostname}:${app.server?.port}/api/docs`
);

// Error handling...
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled Rejection');
  process.exit(1);
});
