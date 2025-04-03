import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const entryTypes = ["text", "audio", "video"] as const;
export const visibilityTypes = ["private", "scheduled"] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  email: text("email"),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
});

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  content: text("content"),
  mediaUrl: text("media_url"),
  type: text("type", { enum: entryTypes }).notNull(),
  visibility: text("visibility", { enum: visibilityTypes }).default("private"),
  categoryId: integer("category_id").references(() => categories.id),
  metadata: text("metadata"), // For storing JSON metadata like trim points, thumbnails
  createdAt: timestamp("created_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  phoneNumber: text("phone_number"),
  email: text("email"),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").references(() => entries.id),
  contactId: integer("contact_id").references(() => contacts.id),
  deliveryDate: timestamp("delivery_date").notNull(),
  status: text("status").default("pending"),
  reminderEnabled: boolean("reminder_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  email: true,
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  userId: true,
  name: true,
});

export const insertEntrySchema = createInsertSchema(entries).pick({
  userId: true,
  title: true,
  content: true,
  mediaUrl: true,
  type: true,
  visibility: true,
  categoryId: true,
  metadata: true,
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  userId: true,
  name: true,
  phoneNumber: true,
  email: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).pick({
  entryId: true,
  contactId: true,
  deliveryDate: true,
  reminderEnabled: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Entry = typeof entries.$inferSelect;
export type InsertEntry = z.infer<typeof insertEntrySchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

// Extended client-side types
export type EntryWithSchedule = Entry & {
  schedule?: Schedule & { 
    contact?: Contact
  };
};
