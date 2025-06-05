import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ユーザースキーマ（認証用）
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // メールアドレスとして使用
  displayName: text("display_name"), // ニックネームや表示名
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// 組織スキーマ
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  bannerImage: text("banner_image"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

// イベントスキーマ
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  date: text("date"), // YYYY-MM-DD or date range
  location: text("location"),
  bannerImage: text("banner_image"),
  salesStartDate: text("sales_start_date"), // 販売開始日
  salesEndDate: text("sales_end_date"),     // 販売終了日
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

// カテゴリースキーマ
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

// アルバムスキーマ
export const albums = pgTable("albums", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  date: text("date"),
  coverImage: text("cover_image"),
  price: integer("price").notNull(), // 円単位
  isPublished: boolean("is_published").default(false), // 公開状態（true=公開中、false=非公開）
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAlbumSchema = createInsertSchema(albums).omit({
  id: true,
  createdAt: true,
});

// 写真スキーマ
export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  albumId: integer("album_id").notNull(),
  filename: text("filename").notNull(),
  originalUrl: text("original_url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  watermarkedUrl: text("watermarked_url").notNull(),
  price: integer("price").notNull(), // 円単位
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  createdAt: true,
});

// 注文スキーマ
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull(),
  totalAmount: integer("total_amount").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  items: jsonb("items").notNull(), // Array of ordered items (photos and/or albums)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

// Type definitions
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Album = typeof albums.$inferSelect;
export type InsertAlbum = z.infer<typeof insertAlbumSchema>;

export type Photo = typeof photos.$inferSelect & {
  filePath?: string; // 内部的に使用するパス（UIには表示されない）
};
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// Additional schema for cart items
export const cartItemSchema = z.object({
  id: z.string(),
  type: z.enum(["photo", "album"]),
  itemId: z.number(),
  name: z.string(),
  price: z.number(),
  thumbnailUrl: z.string(),
  path: z.string().optional(),
});

export type CartItem = z.infer<typeof cartItemSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
