// src/modules/sales/models/schema.ts

import { pgSchema, serial, text, varchar, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { user } from '../../auth/models/schema';
import { pets } from '../../catalog/models/schema';

export const salesSchema = pgSchema('sales');

export const orderStatusEnum = pgEnum('order_status', [
  'pending_payment',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

export const orders = salesSchema.table('orders', {
  id: serial('id').primaryKey(),
  buyerId: text('buyer_id')
    .notNull()
    .references(() => user.id),

  stripePaymentId: varchar('stripe_payment_id', { length: 255 }).unique(),

  totalAmountCents: integer('total_amount_cents').notNull(),
  status: orderStatusEnum('status').default('pending_payment').notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
});

export const orderItems = salesSchema.table('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  petId: integer('pet_id')
    .notNull()
    .references(() => pets.id),
  priceAtPurchaseCents: integer('price_at_purchase_cents').notNull(),
});
