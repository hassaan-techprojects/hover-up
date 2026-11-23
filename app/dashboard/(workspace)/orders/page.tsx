"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ExternalLink, PackageCheck, RefreshCw, Search, Truck } from "lucide-react";

type OrderItem = {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: string | number;
  totalPrice: string | number;
  customization: Record<string, unknown> | null;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: string | number;
  totalAmount: string | number;
  createdAt: string;
  customer: { id: string; firstName: string; lastName: string | null; email: string; phone: string | null };
  shippingAddress: Record<string, unknown>;
  items: OrderItem[];
  payment: { method: string; status: string; gateway: string | null; transactionId: string | null; paidAt: string | null } | null;
  shipment: { status: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; expectedDeliveryAt: string | null; shippedAt: string | null; deliveredAt: string | null } | null;
};

const statuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

function formatPrice(value: number | string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
}

function statusLabel(status: string) {
  if (status === "CONFIRMED") return "Received";
  return status.charAt(0) + status.slice(1).toLowerCase().replaceAll("_", " ");
}

function statusClass(status: string) {
  if (status === "DELIVERED") return "bg-[#edf5ed] text-[#47724b]";
  if (status === "CANCELLED" || status === "REFUNDED") return "bg-[#faeeee] text-[#a34d4d]";
  if (status === "SHIPPED" || status === "PROCESSING") return "bg-[#edf2f8] text-[#4f6c8c]";
  if (status === "CONFIRMED") return "bg-[#f3eee5] text-[#8b704e]";
  return "bg-[#f4f1ec] text-[#81766a]";
}

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/orders", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load orders.");
      setOrders(data.orders ?? []);
      setCanManage(Boolean(data.canManage));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  async function updateOrder(orderId: string, updates: Record<string, string | null>) {
    setUpdating(orderId);
    setError("");
    try {
      const response = await fetch(`/api/dashboard/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update order.");
      setOrders((current) => current.map((order) => order.id === orderId ? data.order : order));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update order.");
    } finally {
      setUpdating(null);
    }
  }

  async function updateStatus(orderId: string, status: string) {
    await updateOrder(orderId, { status });
  }

  const visibleOrders = useMemo(() => orders.filter((order) => {
    const matchesFilter = filter === "ALL" || order.status === filter;
    const search = query.trim().toLowerCase();
    const address = order.shippingAddress;
    const matchesQuery = !search || [
      order.orderNumber,
      order.customer.firstName,
      order.customer.lastName || "",
      order.customer.email,
      order.customer.phone || "",
      order.customer.id,
      String(address.city || ""),
    ].join(" ").toLowerCase().includes(search);
    return matchesFilter && matchesQuery;
  }), [orders, filter, query]);

  const totalRevenue = orders.filter((order) => order.paymentStatus === "PAID" || order.payment?.method === "COD" && order.status !== "CANCELLED")
    .reduce((sum, order) => sum + Number(order.totalAmount), 0);

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-[#a18c75]">COMMERCE MANAGEMENT</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#111] sm:text-4xl">Orders</h1>
          <p className="mt-2 text-sm text-[#817b72]">Review customer orders, artwork, delivery details and update fulfilment status.</p>
        </div>
        <button type="button" onClick={() => void loadOrders()} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e6dfd5] bg-white px-4 text-xs font-medium text-[#51483f] transition hover:border-[#b99a76] disabled:opacity-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh orders
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "All orders", value: orders.length },
          { label: "Awaiting processing", value: orders.filter((order) => ["PENDING", "CONFIRMED"].includes(order.status)).length },
          { label: "In fulfilment", value: orders.filter((order) => ["PROCESSING", "SHIPPED"].includes(order.status)).length },
          { label: "Order value", value: formatPrice(totalRevenue) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-[#ebe6de] bg-white p-5">
            <p className="text-xs text-[#817b72]">{stat.label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-[#111]">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[#ebe6de] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a49a8d]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order, customer, email or ID..." className="h-10 w-full rounded-lg border border-[#e9e4dc] pl-9 pr-3 text-xs outline-none focus:border-[#b99a76]" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["ALL", ...statuses].map((status) => (
              <button key={status} type="button" onClick={() => setFilter(status)} className={`rounded-lg px-3 py-2 text-[10px] font-medium transition ${filter === status ? "bg-[#171717] text-white" : "bg-[#f7f5f1] text-[#786f64] hover:bg-[#eee8df]"}`}>
                {status === "ALL" ? "All" : statusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg bg-[#fff5f2] px-4 py-3 text-xs text-[#a14d3d]">{error}</p>}

        {loading ? (
          <div className="space-y-3 py-6">{[1, 2, 3].map((value) => <div key={value} className="h-20 animate-pulse rounded-xl bg-[#f4f1ec]" />)}</div>
        ) : visibleOrders.length === 0 ? (
          <div className="py-16 text-center"><PackageCheck size={30} className="mx-auto text-[#b99a76]" /><p className="mt-4 text-sm font-medium text-[#51483f]">No orders found</p><p className="mt-1 text-xs text-[#999]">New customer orders will appear here.</p></div>
        ) : (
          <div className="mt-5 space-y-3">
            {visibleOrders.map((order) => {
              const address = order.shippingAddress;
              const isExpanded = expanded === order.id;
              return (
                <article key={order.id} className="overflow-hidden rounded-xl border border-[#eee9e2]">
                  <div className="grid gap-4 p-4 xl:grid-cols-[1.2fr_1fr_0.8fr_1fr_auto] xl:items-center">
                    <div>
                      <p className="text-xs font-bold text-[#171717]">{order.orderNumber}</p>
                      <p className="mt-1 text-[10px] text-[#999]">{new Date(order.createdAt).toLocaleString("en-IN")}</p>
                      <p className="mt-2 text-[10px] text-[#82766a]">Customer ID: {order.customer.id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#34302b]">{order.customer.firstName} {order.customer.lastName || ""}</p>
                      <p className="mt-1 text-[11px] text-[#888]">{order.customer.email}</p>
                      <p className="mt-1 text-[11px] text-[#888]">{String(address.phone || order.customer.phone || "")}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{formatPrice(order.totalAmount)}</p>
                      <p className="mt-1 text-[10px] text-[#999]">{order.items.length} line item(s) · {order.payment?.method || "—"}</p>
                    </div>
                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
                      <p className="mt-2 text-[10px] text-[#999]">Payment: {statusLabel(order.paymentStatus)}</p>
                      {order.payment?.transactionId && <p className="mt-1 break-all text-[10px] text-[#999]">Transaction ID: {order.payment.transactionId}</p>}
                      {order.payment?.gateway && <p className="mt-1 text-[10px] text-[#999]">Gateway: {order.payment.gateway}</p>}
                      {order.payment?.paidAt && <p className="mt-1 text-[10px] text-[#999]">Paid at: {new Date(order.payment.paidAt).toLocaleString("en-IN")}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button type="button" onClick={() => setExpanded(isExpanded ? null : order.id)} className="rounded-lg border border-[#e7e1d8] px-3 py-2 text-[10px] font-semibold text-[#6b6054] hover:border-[#b99a76]">{isExpanded ? "Hide details" : "View details"}</button>
                      {canManage && (
                        <select aria-label={`Update status for ${order.orderNumber}`} disabled={updating === order.id} value={order.status} onChange={(event) => void updateStatus(order.id, event.target.value)} className="max-w-[150px] rounded-lg border border-[#e7e1d8] bg-white px-2 py-2 text-[10px] outline-none focus:border-[#b99a76] disabled:opacity-50">
                          {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="grid gap-5 border-t border-[#eee9e2] bg-[#fcfbf9] p-4 lg:grid-cols-2">
                      <div>
                        <h3 className="text-[10px] font-semibold tracking-[0.15em] text-[#8b7864]">ORDER ITEMS & CUSTOMIZATION</h3>
                        <div className="mt-3 space-y-3">
                          {order.items.map((item) => {
                            const custom = item.customization || {};
                            const sizes = Array.isArray(custom.sizeBreakdown) ? custom.sizeBreakdown as { size: string; quantity: number }[] : [];
                            return (
                              <div key={item.id} className="rounded-lg border border-[#eee8df] bg-white p-3">
                                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold">{item.productName}</p><p className="mt-1 text-[10px] text-[#999]">{item.variantName || item.sku || "Standard"}</p></div><p className="text-xs font-semibold">{formatPrice(item.totalPrice)}</p></div>
                                <p className="mt-2 text-[10px] text-[#777]">Quantity: {item.quantity}</p>
                                {(typeof custom.packSize === "number" || typeof custom.packSize === "string") && <p className="mt-2 text-[10px] font-semibold text-[#8b7054]">Pack of {String(custom.packSize)}</p>}
                                {sizes.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{sizes.map((size) => <span key={size.size} className="rounded-md bg-[#f5f1eb] px-2 py-1 text-[10px]">{size.size}: {size.quantity}</span>)}</div>}
                                {custom.textOnlyDesign === true && <p className="mt-2 text-[10px] font-semibold text-[#8b7054]">TEXT-ONLY DESIGN — create artwork from customer instructions</p>}
                                <div className="mt-3 flex flex-wrap gap-3">
                                  {typeof custom.frontImageUrl === "string" && <a href={custom.frontImageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#8b7054] underline">Front logo <ExternalLink size={10} /></a>}
                                  {typeof custom.backImageUrl === "string" && <a href={custom.backImageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#8b7054] underline">Back logo <ExternalLink size={10} /></a>}
                                </div>
                                {typeof custom.customizationNotes === "string" && custom.customizationNotes && <p className="mt-3 rounded-lg bg-[#faf8f5] p-2 text-[11px] leading-5 text-[#655c52]">Notes: {custom.customizationNotes}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[10px] font-semibold tracking-[0.15em] text-[#8b7864]">DELIVERY & FULFILMENT</h3>
                        <div className="mt-3 rounded-lg border border-[#eee8df] bg-white p-4 text-xs leading-6 text-[#6d655c]">
                          <p className="font-semibold text-[#171717]">{String(address.fullName || "")}</p>
                          <p>{String(address.addressLine1 || "")}</p>
                          {typeof address.addressLine2 === "string" && address.addressLine2.length > 0 && <p>{address.addressLine2}</p>}
                          <p>{String(address.city || "")}, {String(address.state || "")} {String(address.postalCode || "")}</p>
                          <p>{String(address.country || "India")}</p>
                          <p className="mt-2">Contact: {String(address.phone || "")}</p>
                          <p>WhatsApp: {String(address.whatsappPhone || "Not provided")}</p>
                          <p>Email: {String(address.email || order.customer.email)}</p>
                        </div>
                        <div className="mt-3 rounded-lg border border-[#eee8df] bg-white p-4">
                          <p className="text-[10px] font-semibold tracking-[0.15em] text-[#8b7864]">SHIPPING STATUS</p>
                          <p className="mt-2 flex items-center gap-2 text-xs text-[#655c52]"><Truck size={14} /> {order.shipment ? statusLabel(order.shipment.status) : "Not shipped yet"}</p>
                          {order.shipment?.carrier && <p className="mt-1 text-[11px] text-[#888]">Carrier: {order.shipment.carrier}</p>}
                          {order.shipment?.trackingNumber && <p className="mt-1 text-[11px] text-[#888]">Tracking: {order.shipment.trackingNumber}</p>}
                          {order.shipment?.trackingUrl && <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[10px] text-[#8b7054] underline">Open tracking page</a>}
                          {order.shipment?.expectedDeliveryAt && <p className="mt-2 text-[10px] text-[#777]">Expected delivery: {new Date(order.shipment.expectedDeliveryAt).toLocaleDateString("en-IN")}</p>}
                          {order.shipment?.shippedAt && <p className="mt-1 text-[10px] text-[#777]">Shipped: {new Date(order.shipment.shippedAt).toLocaleDateString("en-IN")}</p>}
                          {order.shipment?.deliveredAt && <p className="mt-1 text-[10px] text-[#777]">Delivered: {new Date(order.shipment.deliveredAt).toLocaleDateString("en-IN")}</p>}
                        </div>
                        {canManage && <div className="mt-3 grid gap-3 rounded-lg border border-[#eee8df] bg-white p-3 sm:grid-cols-2">
                          <label className="text-[10px] text-[#777]">Expected delivery<input type="date" value={order.shipment?.expectedDeliveryAt?.slice(0,10) || ""} onChange={(e) => void updateOrder(order.id, { status: order.status, expectedDeliveryAt: e.target.value || null })} className="mt-1 h-9 w-full rounded-md border border-[#e8e3dc] px-2 text-xs"/></label>
                          <label className="text-[10px] text-[#777]">Shipped date<input type="date" value={order.shipment?.shippedAt?.slice(0,10) || ""} onChange={(e) => void updateOrder(order.id, { status: order.status, shippedAt: e.target.value || null })} className="mt-1 h-9 w-full rounded-md border border-[#e8e3dc] px-2 text-xs"/></label>
                          <label className="text-[10px] text-[#777]">Delivered date<input type="date" value={order.shipment?.deliveredAt?.slice(0,10) || ""} onChange={(e) => void updateOrder(order.id, { status: order.status, deliveredAt: e.target.value || null })} className="mt-1 h-9 w-full rounded-md border border-[#e8e3dc] px-2 text-xs"/></label>
                          <label className="text-[10px] text-[#777]">Carrier<input key={order.shipment?.carrier || "carrier"} defaultValue={order.shipment?.carrier || ""} onBlur={(e) => void updateOrder(order.id, { status: order.status, carrier: e.target.value || null })} placeholder="Carrier name" className="mt-1 h-9 w-full rounded-md border border-[#e8e3dc] px-2 text-xs"/></label>
                          <label className="text-[10px] text-[#777]">Tracking number<input key={order.shipment?.trackingNumber || "tracking"} defaultValue={order.shipment?.trackingNumber || ""} onBlur={(e) => void updateOrder(order.id, { status: order.status, trackingNumber: e.target.value || null })} placeholder="Tracking ID" className="mt-1 h-9 w-full rounded-md border border-[#e8e3dc] px-2 text-xs"/></label>
                          <label className="text-[10px] text-[#777]">Tracking URL<input key={order.shipment?.trackingUrl || "tracking-url"} defaultValue={order.shipment?.trackingUrl || ""} onBlur={(e) => void updateOrder(order.id, { status: order.status, trackingUrl: e.target.value || null })} placeholder="https://..." className="mt-1 h-9 w-full rounded-md border border-[#e8e3dc] px-2 text-xs"/></label>
                        </div>}
                      </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
