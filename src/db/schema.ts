import { 
  pgTable, 
  pgSchema, 
  serial, 
  text, 
  varchar, 
  integer, 
  boolean, 
  timestamp, 
  jsonb, 
  pgEnum,
  index 
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// --- SCHEMAS (Namespaces) ---
export const authSchema = pgSchema("auth");
export const catalogSchema = pgSchema("catalog");
export const salesSchema = pgSchema("sales");
export const caretakingSchema = pgSchema("caretaking");

// --- ENUMS ---
export const petStatusEnum = pgEnum("pet_status", ["available", "sold", "deceased"]);
export const orderStatusEnum = pgEnum("order_status", ["pending_payment", "paid", "fulfilled", "cancelled", "refunded"]);
export const serviceTypeEnum = pgEnum("service_type", ["boarding", "grooming", "training", "medical_check"]);

// --- AUTH MODULE ---

export const user = authSchema.table("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  
  role: text("role").default("customer"),
  phoneNumber: varchar("phone_number", { length: 20 }),

  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = authSchema.table("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(), 
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id),
});

export const account = authSchema.table("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id),
  
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  
  password: text("password"),
  
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = authSchema.table("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Auth Relations
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  pets: many(pets),
  orders: many(orders),
  services: many(services),
  bookings: many(bookings),
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

// --- CATALOG MODULE ---

export const pets = catalogSchema.table("pets", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => user.id),
  
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  
  attributes: jsonb("attributes").$type<Record<string, any>>().notNull().default({}),
  
  priceCents: integer("price_cents").notNull(),
  status: petStatusEnum("status").default("available"),
  
  version: integer("version").default(1),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    ownerIdx: index("owner_idx").on(table.ownerId),
    attributesGinIdx: index("attributes_gin_idx")
        .using("gin", table.attributes),
  };
});

export const petImages = catalogSchema.table("pet_images", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull().references(() => pets.id),
  url: varchar("url", { length: 255 }).notNull(),
  isPrimary: boolean("is_primary").default(false),
});

// Catalog Relations
export const petsRelations = relations(pets, ({ one, many }) => ({
  owner: one(user, {
    fields: [pets.ownerId],
    references: [user.id],
  }),
  images: many(petImages),
  orderItem: one(orderItems),
}));

export const petImagesRelations = relations(petImages, ({ one }) => ({
  pet: one(pets, {
    fields: [petImages.petId],
    references: [pets.id],
  }),
}));

// --- SALES MODULE ---

export const orders = salesSchema.table("orders", {
  id: serial("id").primaryKey(),
  buyerId: text("buyer_id").notNull().references(() => user.id),
  
  stripePaymentId: varchar("stripe_payment_id", { length: 255 }).unique(),
  
  totalAmountCents: integer("total_amount_cents").notNull(),
  status: orderStatusEnum("status").default("pending_payment"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
});

export const orderItems = salesSchema.table("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  petId: integer("pet_id").notNull().references(() => pets.id),
  priceAtPurchaseCents: integer("price_at_purchase_cents").notNull(),
});

// Sales Relations
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

// --- CARETAKING MODULE ---

export const services = caretakingSchema.table("services", {
  id: serial("id").primaryKey(),
  providerId: text("provider_id").notNull().references(() => user.id),
  
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  serviceType: serviceTypeEnum("service_type").notNull(),
  
  basePriceCents: integer("base_price_cents").notNull(),
  isActive: boolean("is_active").default(true),
});

export const bookings = caretakingSchema.table("bookings", {
  id: serial("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => user.id),
  serviceId: integer("service_id").notNull().references(() => services.id),
  petId: integer("pet_id").notNull().references(() => pets.id),
  
  status: varchar("status", { length: 50 }).default("pending"),
  
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const logs = caretakingSchema.table("logs", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  
  activityType: varchar("activity_type", { length: 50 }).notNull(), // FED, WALKED
  description: text("description"),
  imageProofUrl: varchar("image_proof_url", { length: 255 }),
  
  loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow(),
});

// Caretaking Relations
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
}));