import { pgSchema, serial, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { user } from "../../users/models/schema";
import { petTypeEnum } from "../../catalog/models/schema";

export const communitySchema = pgSchema("community");

export const posts = communitySchema.table("posts", {
  id: serial("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => user.id),
  
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  
  lookingForType: petTypeEnum("looking_for_type"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const comments = communitySchema.table("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id),
  authorId: text("author_id").notNull().references(() => user.id),
  
  content: text("content").notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});