// src/modules/auth/controllers/auth.controller.ts

import { Elysia, t } from 'elysia';
import { auth } from '../lib/auth-client';

export const authController = new Elysia({ prefix: '/auth' })
  // --- Model Definition ---
  .model({
    'auth.user': t.Object({
      id: t.String(),
      email: t.String({ format: 'email' }),
      name: t.String(),
      image: t.Optional(t.String()),
      roles: t.Array(t.String(), {
        default: ['customer'],
        examples: [['customer', 'admin']],
      }),
      createdAt: t.Date(),
      updatedAt: t.Date(),
    }),
    'auth.session': t.Object({
      id: t.String(),
      token: t.String(),
      expiresAt: t.Date(),
      ipAddress: t.Optional(t.String()),
      userAgent: t.Optional(t.String()),
      userId: t.String(),
    }),
  })

  // --- Global Guard ---
  .guard(
    {
      detail: { tags: ['Auth'] },
    },
    (app) =>
      app
        // --- Sign Up ---
        .post(
          '/sign-up/email',
          async ({ request, body }) => {
            const newReq = new Request(request.url, {
              method: request.method,
              headers: request.headers,
              body: JSON.stringify(body),
            });
            return auth.handler(newReq);
          },
          {
            body: t.Object({
              name: t.String({
                examples: ['John Doe'],
                default: 'John Doe',
              }),
              email: t.String({
                format: 'email',
                examples: ['john.doe@example.com'],
                default: 'john.doe@example.com',
              }),
              password: t.String({
                minLength: 8,
                examples: ['Str0ngP@ssw0rd!'],
                default: 'Str0ngP@ssw0rd!',
              }),
              image: t.Optional(
                t.String({
                  examples: ['https://api.dicebear.com/7.x/avataaars/svg?seed=John'],
                  default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
                })
              ),
            }),
            detail: {
              summary: 'Register a new user',
              description: 'Creates a new user account with email and password.',
            },
          }
        )

        // --- Sign In ---
        .post(
          '/sign-in/email',
          async ({ request, body }) => {
            const newReq = new Request(request.url, {
              method: request.method,
              headers: request.headers,
              body: JSON.stringify(body),
            });
            return auth.handler(newReq);
          },
          {
            body: t.Object({
              email: t.String({
                format: 'email',
                examples: ['john.doe@example.com'],
                default: 'john.doe@example.com',
              }),
              password: t.String({
                examples: ['Str0ngP@ssw0rd!'],
                default: 'Str0ngP@ssw0rd!',
              }),
              rememberMe: t.Optional(
                t.Boolean({
                  default: false,
                  examples: [false],
                })
              ),
            }),
            detail: {
              summary: 'Sign in with Email',
              description: 'Authenticate a user using email and password.',
            },
          }
        )

        // --- Sign Out ---
        .post(
          '/sign-out',
          async ({ request, body }) => {
            const newReq = new Request(request.url, {
              method: request.method,
              headers: request.headers,
              body: JSON.stringify(body),
            });
            return auth.handler(newReq);
          },
          {
            body: t.Object({}),
            detail: {
              summary: 'Sign Out',
              description: 'Invalidates the current session.',
            },
          }
        )

        // --- Fallback Handler ---
        .all('/*', ({ request }) => {
          return auth.handler(request);
        })
  );
