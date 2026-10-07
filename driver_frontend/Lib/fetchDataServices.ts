import { api } from "./api";

// ── Dashboard stats ────────────────────────────────────────────────
export async function DashboardDataFetcher() {
  const res = await api.get("/delivery/agent/dashboard");
  return res.data?.data || res.data;
}

// ── My delivery requests (active/available) ────────────────────────
export async function AgentRequestsFetcher(status?: string) {
  const params = status ? `?status=${status}` : "";
  const res = await api.get(`/delivery/agent/requests${params}`);
  return res.data?.data || [];
}

// ── Single delivery detail ─────────────────────────────────────────
export async function DeliveryDetailsFetcher(requestId: string) {
  const res = await api.get(`/delivery-requests/${requestId}`);
  return res.data?.data || res.data;
}

// ── Accept / Decline / Complete ────────────────────────────────────
export async function AcceptDelivery(requestId: string) {
  const res = await api.post(`/delivery/agent/requests/${requestId}/accept`);
  return res.data?.data || res.data;
}

export async function DeclineDelivery(requestId: string) {
  const res = await api.post(`/delivery/agent/requests/${requestId}/decline`);
  return res.data?.data || res.data;
}

export async function CompleteDelivery(requestId: string, photoUrl?: string) {
  const res = await api.post(`/delivery/agent/requests/${requestId}/complete`, {
    delivery_photo_url: photoUrl,
  });
  return res.data?.data || res.data;
}

// ── Status change (legacy compat) ──────────────────────────────────
export async function DeliveryStatusChange(requestId: string, status: string) {
  if (status === "completed" || status === "delivered") {
    return CompleteDelivery(requestId);
  }
  if (status === "cancelled") {
    return DeclineDelivery(requestId);
  }
  if (status === "in_progress" || status === "accepted") {
    return AcceptDelivery(requestId);
  }
  if (status === "collected" || status === "on_delivery") {
    // Confirm pickup — mark as collected
    const res = await api.patch(`/delivery/requests/${requestId}/update-status`, { status });
    return res.data?.data || res.data;
  }
  throw new Error(`Unknown status: ${status}`);
}

// ── Agent profile ──────────────────────────────────────────────────
export async function GetAgentProfile() {
  const res = await api.get("/delivery/agent/me");
  return res.data?.data || res.data;
}

// ── Go online / offline ────────────────────────────────────────────
export async function SetAgentStatus(isOnline: boolean) {
  const res = await api.patch("/delivery/agent/status", { is_active: isOnline });
  return res.data?.data || res.data;
}

// ── Update location ────────────────────────────────────────────────
export async function UpdateAgentLocation(lat: number, lng: number) {
  const res = await api.patch("/delivery/agent/location", { lat, lng });
  return res.data;
}

// ── Earnings ───────────────────────────────────────────────────────
export async function GetEarnings(period: string = "7d") {
  const res = await api.get(`/delivery/earnings?period=${period}`);
  return res.data?.data || res.data;
}

export async function GetTipHistory(period: string = "week") {
  const res = await api.get(`/delivery/tip-history?period=${period}`);
  return res.data?.data || res.data;
}

// ── Shifts ─────────────────────────────────────────────────────────
export async function GetShifts(week?: string) {
  const params = week ? `?week=${week}` : "";
  const res = await api.get(`/delivery/shifts${params}`);
  return res.data?.data || [];
}

// ── Badges ─────────────────────────────────────────────────────────
export async function GetBadges() {
  const res = await api.get("/delivery/badges");
  return res.data?.data || [];
}

// ── Training ───────────────────────────────────────────────────────
export async function GetTraining() {
  const res = await api.get("/delivery/training");
  return res.data?.data || [];
}

// ── Expenses ───────────────────────────────────────────────────────
export async function GetExpenses(month?: string) {
  const params = month ? `?month=${month}` : "";
  const res = await api.get(`/delivery/expenses${params}`);
  return res.data?.data || [];
}

export async function SubmitExpense(data: { category: string; amount: number; description: string }) {
  const res = await api.post("/delivery/expenses", data);
  return res.data?.data || res.data;
}

// ── Messages ───────────────────────────────────────────────────────
export async function GetMessages(deliveryId: string) {
  const res = await api.get(`/delivery/messages/${deliveryId}`);
  return res.data?.data || [];
}

export async function SendMessage(deliveryId: string, message: string) {
  const res = await api.post(`/delivery/messages/${deliveryId}`, { message_text: message });
  return res.data?.data || res.data;
}

// ── Route data (not available in BFM — stub) ───────────────────────
export async function getRouteByDriverIdAndDate(_driverId: string, _date: string) {
  // BFM doesn't have a route optimization endpoint like the original project
  // Returns null — RouteVisualization screen will show "No route data"
  return null;
}
