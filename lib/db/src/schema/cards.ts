import {
  pgTable,
  text,
  serial,
  boolean,
  timestamp,
  real,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cardLinkSchema = z.object({
  type: z.string(),
  label: z.string().nullable().optional(),
  url: z.string(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
});

export type CardLink = z.infer<typeof cardLinkSchema>;

export const cardsTable = pgTable("cards", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  username: text("username").unique(),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),

  // Brand
  brandName: text("brand_name"),
  brandSubtitle: text("brand_subtitle"),

  // Personal info
  fullName: text("full_name").notNull(),
  professionalTitle: text("professional_title"),
  location: text("location"),
  showStatusDot: boolean("show_status_dot").notNull().default(false),

  // Bio
  bio: text("bio"),

  // Profile image
  profileImageUrl: text("profile_image_url"),

  // Theme
  accentColor: text("accent_color").notNull().default("#e63946"),
  textColor: text("text_color").notNull().default("#1a1a2e"),
  bgColor: text("bg_color").notNull().default("#f8f9fa"),
  fontStyle: text("font_style").notNull().default("outfit"),
  bgIconPack: text("bg_icon_pack").notNull().default("tech"),
  bgIconDensity: real("bg_icon_density").notNull().default(1.0),
  bgIconOpacity: real("bg_icon_opacity").notNull().default(0.08),

  // Links (JSON array)
  links: jsonb("links").notNull().default([]),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCardSchema = createInsertSchema(cardsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cardsTable.$inferSelect;
