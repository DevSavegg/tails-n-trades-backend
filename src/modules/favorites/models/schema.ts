import { pgSchema, text, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { user } from '../../auth/models/schema';
import { pets } from '../../catalog/models/schema';

export const favoritesSchema = pgSchema('favorites');

export const favorites = favoritesSchema.table(
  'user_favorites',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    petId: integer('pet_id')
      .notNull()
      .references(() => pets.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.petId] }),
  })
);
