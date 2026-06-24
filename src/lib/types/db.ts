/**
 * Database row types + enums mirroring supabase/migrations/0001_init.sql.
 * Keep these in sync with the SQL schema — they are the contract between
 * the database, Server Actions, and the UI.
 */

export type StaffRole = "ADMIN" | "MANAGER" | "KITCHEN" | "WAITER" | "CASHIER";

export type TableStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "BILL_REQUESTED"
  | "PAYMENT_PENDING"
  | "CLEANING";

export type TableSessionStatus =
  | "ACTIVE"
  | "BILL_REQUESTED"
  | "PAYMENT_PENDING"
  | "COMPLETED";

export type OrderStatus =
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "COMPLETED"
  | "CANCELLED";

export type WaiterRequestType =
  | "CALL_WAITER"
  | "NEED_WATER"
  | "NEED_CUTLERY"
  | "NEED_ASSISTANCE"
  | "REQUEST_BILL";

export type WaiterRequestStatus = "PENDING" | "ACKNOWLEDGED" | "RESOLVED";

export type PaymentStatus = "PENDING" | "COMPLETED" | "REFUNDED" | "FAILED";
export type PaymentMethod = "CASH" | "CARD" | "UPI" | "OTHER";

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  available: boolean;
  popular: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RestaurantTable {
  id: string;
  name: string;
  seat_capacity: number;
  status: TableStatus;
  created_at: string;
  updated_at: string;
}

export interface QrToken {
  id: string;
  table_id: string;
  token: string;
  created_at: string;
  revoked_at: string | null;
}

export interface TableSession {
  id: string;
  table_id: string;
  qr_token_id: string;
  status: TableSessionStatus;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  table_id: string;
  table_session_id: string;
  status: OrderStatus;
  total_cents: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  unit_price_cents: number;
  quantity: number;
  notes: string | null;
}

export interface Staff {
  id: string;
  user_id: string;
  full_name: string;
  role: StaffRole;
  active: boolean;
  created_at: string;
}

export interface WaiterRequest {
  id: string;
  table_session_id: string;
  table_id: string;
  type: WaiterRequestType;
  status: WaiterRequestStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface Feedback {
  id: string;
  table_session_id: string;
  order_id: string | null;
  food_rating: number;
  service_rating: number;
  comment: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  table_session_id: string;
  amount_cents: number;
  method: PaymentMethod;
  status: PaymentStatus;
  processed_by: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface QrToken {
  id: string;
  table_id: string;
  token: string;
  created_at: string;
  revoked_at: string | null;
}

export interface ActivityLog {
  id: string;
  staff_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface RestaurantSettings {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_rate_percent: number;
  service_charge_amount: number;
  receipt_footer: string | null;
  updated_at: string;
}

/** Order with its line items — the shape used across UI. */
export interface OrderWithItems extends Order {
  order_items: OrderItem[];
  tables?: Pick<RestaurantTable, "id" | "name">;
}

/** A cart line lives only client-side until the order is placed. */
export interface CartLine {
  menu_item_id: string;
  name: string;
  unit_price_cents: number;
  image_url: string | null;
  quantity: number;
  notes: string;
}

export type ExpiryType = "WEEKLY" | "MONTHLY" | "CUSTOM";

export interface Reward {
  id: string;
  name: string;
  probability: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  expiry_type: ExpiryType;
  expires_at: string;
  used_at: string | null;
  reward_id: string | null;
  created_at: string;
}
