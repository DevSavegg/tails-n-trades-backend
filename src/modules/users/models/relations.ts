import { relations } from 'drizzle-orm';
import { user, session, account, profiles } from './schema';

import { pets } from '../../catalog/models/schema';
import { orders } from '../../sales/models/schema';
import { services, bookings } from '../../caretaking/models/schema';
import { posts, comments } from '../../community/models/schema';

export const userRelations = relations(user, ({ one, many }) => ({
  // Internal Relations
  profile: one(profiles, {
    fields: [user.id],
    references: [profiles.userId],
  }),
  sessions: many(session),
  accounts: many(account),

  // External Relations
  pets: many(pets),
  orders: many(orders),
  services: many(services),
  bookings: many(bookings),
  posts: many(posts),
  comments: many(comments),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
