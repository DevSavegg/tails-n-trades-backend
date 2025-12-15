// src/modules/caretaking/controllers/caretaking.controller.ts

import { Elysia, t } from 'elysia';
import { caretakingService } from '../services/caretaking.service';
import { isAuthenticated } from '../../auth/lib/guards';

const hasRole = (user: any, role: string) => {
  return user.roles && user.roles.includes(role);
};

export const caretakingController = new Elysia({ prefix: '/caretaking' }).guard(
  {
    detail: { tags: ['Caretaking'] },
  },
  (app) =>
    app

      // --- Services Group ---
      .group('/services', (app) =>
        app
          // Public: Browse
          .get(
            '/',
            async ({ query }) => {
              return await caretakingService.getServices({
                type: query.type,
              });
            },
            {
              query: t.Object({
                type: t.Optional(
                  t.String({
                    default: 'grooming',
                    examples: ['grooming', 'boarding'],
                    description: 'Filter services by type',
                  })
                ),
              }),
              detail: {
                summary: 'Browse Services',
                description: 'Find boarding, grooming, or training services.',
              },
            }
          )

          // Protected: Create
          .use(isAuthenticated)
          .post(
            '/',
            async ({ user, body, set }) => {
              if (!hasRole(user, 'caretaker') && !hasRole(user, 'admin')) {
                set.status = 403;
                return 'Only caretakers can list services.';
              }

              return await caretakingService.createService(user.id, {
                ...body,
                providerId: user.id,
                isActive: true,
              } as any);
            },
            {
              body: t.Object({
                title: t.String({ default: 'Luxury Dog Boarding' }),
                description: t.String({ default: '24/7 care for your furry friend.' }),
                type: t.Enum(
                  {
                    boarding: 'boarding',
                    grooming: 'grooming',
                    training: 'training',
                    medical_check: 'medical_check',
                    walking: 'walking',
                  },
                  { default: 'boarding' }
                ),
                basePriceCents: t.Number({ default: 5000 }),
                priceUnit: t.Optional(t.String({ default: 'per_night' })),
              }),
              detail: {
                summary: 'Create Service Listing',
              },
            }
          )
      )

      // --- Bookings Group ---
      .group('/bookings', (app) =>
        app
          .use(isAuthenticated)

          // Create Booking
          .post(
            '/',
            async ({ user, body, set }) => {
              try {
                return await caretakingService.createBooking(user.id, {
                  ...body,
                  startDate: new Date(body.startDate),
                  endDate: new Date(body.endDate),
                });
              } catch (e: any) {
                set.status = 400;
                return e.message;
              }
            },
            {
              body: t.Object({
                serviceId: t.Number({ default: 1 }),
                petId: t.Number({ default: 101 }),
                startDate: t.String({ format: 'date-time', default: new Date().toISOString() }),
                endDate: t.String({
                  format: 'date-time',
                  default: new Date(Date.now() + 86400000).toISOString(),
                }),
              }),
              detail: {
                summary: 'Book a Service',
              },
            }
          )

          // Get My Bookings
          .get(
            '/',
            async ({ user, query }) => {
              const role = query.view === 'provider' ? 'provider' : 'customer';
              return await caretakingService.getMyBookings(user.id, role);
            },
            {
              query: t.Object({
                view: t.Optional(
                  t.String({
                    default: 'customer',
                    examples: ['customer', 'provider'],
                  })
                ),
              }),
              detail: {
                summary: 'Get My Bookings',
                description:
                  'View bookings made by you (customer) or for your services (provider).',
              },
            }
          )

          // Update Status (Provider)
          .patch(
            '/:id/status',
            async ({ user, params, body, set }) => {
              try {
                return await caretakingService.updateBookingStatus(
                  Number(params.id),
                  user.id,
                  body.status as any
                );
              } catch (e: any) {
                set.status = 403;
                return e.message;
              }
            },
            {
              params: t.Object({ id: t.String({ default: '1' }) }),
              body: t.Object({
                status: t.String({
                  default: 'accepted',
                  examples: ['accepted', 'rejected', 'completed'],
                }),
              }),
              detail: {
                summary: 'Update Booking Status',
              },
            }
          )

          // Add Log (Provider)
          .post(
            '/:id/logs',
            async ({ user, params, body, set }) => {
              try {
                return await caretakingService.addLog(user.id, Number(params.id), body);
              } catch (e: any) {
                set.status = 403;
                return e.message;
              }
            },
            {
              params: t.Object({ id: t.String({ default: '1' }) }),
              body: t.Object({
                title: t.String({ default: 'Morning Walk' }),
                description: t.Optional(t.String({ default: 'He was very energetic today!' })),
                imageUrl: t.Optional(t.String()),
              }),
              detail: {
                summary: 'Add Care Log',
                description: 'Post updates (images/text) about the pet during their stay.',
              },
            }
          )

          // View Logs
          .get(
            '/:id/logs',
            async ({ params }) => {
              return await caretakingService.getBookingLogs(Number(params.id));
            },
            {
              params: t.Object({ id: t.String({ default: '1' }) }),
              detail: {
                summary: 'View Booking Logs',
              },
            }
          )
      )
);
