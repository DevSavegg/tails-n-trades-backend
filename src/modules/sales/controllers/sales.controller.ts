// src/modules/sales/controllers/sales.controller.ts

import { Elysia, t } from 'elysia';
import { salesService } from '../services/sales.service';
import { isAuthenticated } from '../../auth/lib/guards';

export const salesController = new Elysia({ prefix: '/sales' })
  .use(isAuthenticated)

  .group('/orders', (app) =>
    app.guard(
      {
        detail: { tags: ['Orders'] },
      },
      (app) =>
        app
          .post(
            '/',
            async ({ user, body, set }) => {
              try {
                return await salesService.createOrder(user.id, body.petIds);
              } catch (e: any) {
                set.status = 400;
                return { error: e.message };
              }
            },
            {
              body: t.Object({
                petIds: t.Array(t.Number(), {
                  minItems: 1,
                  default: [101, 102],
                  examples: [[101, 102]],
                  description: 'Array of Pet IDs to purchase',
                }),
              }),
              detail: {
                summary: 'Create Order',
                description: 'Start a checkout process.',
              },
            }
          )

          .get(
            '/:id',
            async ({ user, params, set }) => {
              try {
                const order = await salesService.getOrderById(Number(params.id), user.id);
                if (!order) {
                  set.status = 404;
                  return { error: 'Order not found' };
                }
                return order;
              } catch (e: any) {
                set.status = 403;
                return { error: e.message };
              }
            },
            {
              params: t.Object({
                id: t.String({ default: '50', examples: ['50'] }),
              }),
              detail: {
                summary: 'Get Order Details',
              },
            }
          )

          .post(
            '/:id/pay',
            async ({ user, params, body, set }) => {
              try {
                return await salesService.updateOrderStatus(
                  Number(params.id),
                  'paid',
                  body.stripePaymentId
                );
              } catch (e: any) {
                set.status = 400;
                return { error: e.message };
              }
            },
            {
              params: t.Object({
                id: t.String({ default: '50', examples: ['50'] }),
              }),
              body: t.Object({
                stripePaymentId: t.Optional(
                  t.String({
                    default: 'pi_test_123',
                    examples: ['pi_3MtwMdLkdIwHu7ix28a3tqPa'],
                  })
                ),
              }),
              detail: {
                summary: 'Simulate Payment',
                description: 'Dev only: Mark order as PAID.',
              },
            }
          )
    )
  );
