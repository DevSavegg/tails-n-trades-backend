// src/modules/users/models/relations.ts
import { relations } from 'drizzle-orm';
import { profiles } from './schema';
import { user } from '../../auth/models/schema';

export const profileRelations = relations(profiles, ({ one }) => ({
  user: one(user, {
    fields: [profiles.userId],
    references: [user.id],
  }),
}));
