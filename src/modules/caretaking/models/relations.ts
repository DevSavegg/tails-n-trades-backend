import { relations } from 'drizzle-orm';
import { services, bookings, logs } from './schema';
import { user } from '../../users/models/schema';
import { pets } from '../../catalog/models/schema';

export const servicesRelations = relations(services, ({ one, many }) => ({
  provider: one(user, {
    fields: [services.providerId],
    references: [user.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  customer: one(user, {
    fields: [bookings.customerId],
    references: [user.id],
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
  pet: one(pets, {
    fields: [bookings.petId],
    references: [pets.id],
  }),
  logs: many(logs),
}));

export const logsRelations = relations(logs, ({ one }) => ({
  booking: one(bookings, {
    fields: [logs.bookingId],
    references: [bookings.id],
  }),
  author: one(user, {
    fields: [logs.authorId],
    references: [user.id],
  }),
}));
