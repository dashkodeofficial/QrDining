import { z } from "zod";

/* ---------------------------------------------------------------------------
 * Prices are stored as integer rupees in the DB. Admin enters whole rupees
 * in forms — no conversion needed.
 * ------------------------------------------------------------------------ */
export const priceToInteger = z
  .coerce
  .number()
  .int()
  .nonnegative()
  .max(10000000, "Price too large");

/* ---------------------------------------------------------------------------
 * Menu management (admin)
 * ------------------------------------------------------------------------ */
export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens"),
  sort_order: z.coerce.number().int().min(0).default(0),
});

export const menuItemSchema = z.object({
  category_id: z.string().uuid("Select a category"),
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  price: priceToInteger,
  image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  available: z.coerce.boolean().default(true),
  popular: z.coerce.boolean().default(false),
  sort_order: z.coerce.number().int().min(0).default(0),
});

/* ---------------------------------------------------------------------------
 * Tables (admin)
 * ------------------------------------------------------------------------ */
export const tableSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(20),
  seat_capacity: z.coerce.number().int().min(1).max(40),
});

/* ---------------------------------------------------------------------------
 * Customer order placement
 *   payload sent from the cart to the placeOrder Server Action.
 * ------------------------------------------------------------------------ */
export const cartLineInput = z.object({
  menu_item_id: z.string().uuid(),
  name: z.string().min(1),
  unit_price_cents: z.number().int().nonnegative(),
  image_url: z.string().nullable().optional(),
  quantity: z.number().int().min(1).max(99),
  notes: z.string().max(200).optional().or(z.literal("")),
});

export const placeOrderSchema = z.object({
  items: z.array(cartLineInput).min(1, "Cart is empty"),
  notes: z.string().max(500).optional().or(z.literal("")),
  tableId: z.string().optional(),
});

/* ---------------------------------------------------------------------------
 * Staff (admin manages)
 * ------------------------------------------------------------------------ */
export const staffSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(80),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "MANAGER", "KITCHEN", "WAITER", "CASHIER"]),
});

/* ---------------------------------------------------------------------------
 * Feedback (customer, gated on served+paid)
 * ------------------------------------------------------------------------ */
export const feedbackSchema = z.object({
  food_rating: z.coerce.number().int().min(1).max(5),
  service_rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional().or(z.literal("")),
});

/* ---------------------------------------------------------------------------
 * Login
 * ------------------------------------------------------------------------ */
export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/* ---------------------------------------------------------------------------
 * Restaurant settings (admin/owner)
 * ------------------------------------------------------------------------ */
export const settingsSchema = z.object({
  name: z.string().trim().min(1, "Restaurant name is required").max(80),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  tax_rate_percent: z.coerce.number().int().min(0).max(100).default(0),
  service_charge_amount: z.coerce.number().int().min(0).max(100000).default(0),
  receipt_footer: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type TableInput = z.infer<typeof tableSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type StaffInput = z.infer<typeof staffSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
