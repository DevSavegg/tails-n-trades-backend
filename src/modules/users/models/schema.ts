// src/modules/users/models/schema.ts

import { text, boolean, varchar, integer } from 'drizzle-orm/pg-core';
import { authSchema, user } from '../../auth/models/schema';

export const profiles = authSchema.table('profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id),
  bio: text('bio'),
  phoneNumber: varchar('phone_number', { length: 20 }),
  addressCity: text('address_city'),
  sellerRating: integer('seller_rating').default(0),
  sellerVerified: boolean('seller_verified').default(false),
});
