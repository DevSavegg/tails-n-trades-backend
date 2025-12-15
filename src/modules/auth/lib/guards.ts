// src/modules/auth/lib/guards.ts
import { Elysia } from 'elysia';
import { auth } from './auth-client';

export const isAuthenticated = (app: Elysia) =>
  app.derive(async ({ request, set }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      set.status = 401;

      throw new Error('Unauthorized: Please sign in to access this resource.');
    }

    return {
      user: session.user,
      session: session.session,
    };
  });
