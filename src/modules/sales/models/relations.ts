// src/modules/sales/models/relations.ts

import { relations } from 'drizzle-orm';
import { orders, orderItems } from './schema';
import { user } from '../../auth/models/schema';
import { pets } from '../../catalog/models/schema';

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(user, {
    fields: [orders.buyerId],
    references: [user.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  pet: one(pets, {
    fields: [orderItems.petId],
    references: [pets.id],
  }),
}));
