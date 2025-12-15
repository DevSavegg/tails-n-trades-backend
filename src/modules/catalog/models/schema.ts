import { pgSchema, serial, text, varchar, integer, boolean, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { user } from "../../users/models/schema";

export const catalogSchema = pgSchema("catalog");

export const petTypeEnum = pgEnum("pet_type", [
  "dog", "cat", "bird", "fish", "reptile", "insect", "exotic"
]);

export const petStatusEnum = pgEnum("pet_status", [
  "available", "pending", "sold", "care_stay", "deceased"
]);

export const pets = catalogSchema.table("pets", {
  id: serial("id").primaryKey(),
  
  ownerId: text("owner_id").notNull().references(() => user.id),
  
  name: varchar("name", { length: 100 }).notNull(),
  type: petTypeEnum("type").notNull(),
  
  attributes: jsonb("attributes").$type<{
    breed?: string;
    age_months?: number;
    color?: string;
    weight_kg?: number;
    sex?: 'male' | 'female';
    is_vaccinated?: boolean;
    [key: string]: any;
  }>().notNull().default({}),
  
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  status: petStatusEnum("status").default("available").notNull(),
  version: integer("version").default(1),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  ownerIdx: index("owner_idx").on(table.ownerId),
  attributesGinIdx: index("attributes_gin_idx").using("gin", table.attributes),
}));

export const petImages = catalogSchema.table("pet_images", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull().references(() => pets.id),
  url: varchar("url", { length: 255 }).notNull(),
  isPrimary: boolean("is_primary").default(false),
});