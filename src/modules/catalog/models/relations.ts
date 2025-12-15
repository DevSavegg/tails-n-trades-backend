import { relations } from "drizzle-orm";
import { pets, petImages } from "./schema";
import { user } from "../../users/models/schema";
import { orderItems } from "../../sales/models/schema";
import { bookings } from "../../caretaking/models/schema";

export const petsRelations = relations(pets, ({ one, many }) => ({
  owner: one(user, {
    fields: [pets.ownerId],
    references: [user.id],
  }),
  images: many(petImages),
  orderItems: many(orderItems),
  bookings: many(bookings),
}));

export const petImagesRelations = relations(petImages, ({ one }) => ({
  pet: one(pets, {
    fields: [petImages.petId],
    references: [pets.id],
  }),
}));