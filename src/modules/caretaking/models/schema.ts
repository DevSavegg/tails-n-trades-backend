import { pgSchema, serial, text, varchar, integer, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { user } from "../../users/models/schema";
import { pets } from "../../catalog/models/schema";

export const caretakingSchema = pgSchema("caretaking");

export const serviceTypeEnum = pgEnum("service_type", [
  "boarding", "grooming", "training", "medical_check", "walking"
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending", "accepted", "rejected", "in_progress", "completed", "cancelled"
]);

export const services = caretakingSchema.table("services", {
  id: serial("id").primaryKey(),
  providerId: text("provider_id").notNull().references(() => user.id),
  
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  type: serviceTypeEnum("type").notNull(),
  
  basePriceCents: integer("base_price_cents").notNull(),
  priceUnit: text("price_unit").default("per_day"),
  isActive: boolean("is_active").default(true),
});

export const bookings = caretakingSchema.table("bookings", {
  id: serial("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => user.id),
  serviceId: integer("service_id").notNull().references(() => services.id),
  petId: integer("pet_id").notNull().references(() => pets.id),
  
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  
  totalPriceCents: integer("total_price_cents").notNull(),
  status: bookingStatusEnum("status").default("pending").notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const logs = caretakingSchema.table("logs", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  authorId: text("author_id").notNull().references(() => user.id),
  
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 255 }),
  meta: jsonb("meta"),
  
  loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow(),
});