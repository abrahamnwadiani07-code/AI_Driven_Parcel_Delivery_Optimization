export enum DeliveryStatus {
  pending = "pending",
  offered = "offered",
  accepted = "accepted",
  collected = "collected",
  on_delivery = "on_delivery",
  in_progress = "in_progress",
  delivered = "delivered",
  completed = "completed",
  cancelled = "cancelled",
  failed = "failed",
}

export interface DeliveryQueueForDriver {
  id: string;
  delivery_id?: string;
  order_id?: string;
  status: DeliveryStatus;
  fee?: string | number;
  order_total?: string | number;
  delivery_address?: string | { line1?: string; city?: string; postcode?: string };
  pickup_address?: string;
  vendor_name?: string;
  customer_name?: string;
  customer_phone?: string;
  source?: string;
  created_at?: string;
  accepted_at?: string;
  delivered_at?: string;
  scheduled_for?: string;
}
