import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

type CheckoutItem = {
  productId: string;
  packSize: number;
  color?: string;
  sizeBreakdown?: { size: string; quantity: number; variantId?: string | null }[];
  frontImageUrl?: string;
  backImageUrl?: string;
  customizationNotes?: string;
};

function clean(value: unknown, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customerName = clean(body.customerName, 120);
    const email = clean(body.email, 180).toLowerCase();
    const phone = clean(body.phone, 30);
    const whatsapp = clean(body.whatsapp, 30);
    const addressLine1 = clean(body.addressLine1, 250);
    const addressLine2 = clean(body.addressLine2, 250);
    const city = clean(body.city, 100);
    const state = clean(body.state, 100);
    const postalCode = clean(body.postalCode, 20);
    const notes = clean(body.notes, 1000);
    const items = body.items as CheckoutItem[];

    if (!customerName || !email || !phone || !addressLine1 || !city || !state || !postalCode) {
      return NextResponse.json({ error: "Please complete all required contact and delivery fields." }, { status: 400 });
    }
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
      return NextResponse.json({ error: "Your shopping bag is empty or contains too many items." }, { status: 400 });
    }

    const prepared = [];
    for (const item of items) {
      if (!item?.productId || !Number.isInteger(item.packSize) || item.packSize < 1 || item.packSize > 1000) {
        return NextResponse.json({ error: "A cart item has invalid pack details." }, { status: 400 });
      }
      const product = await prisma.product.findFirst({
        where: { id: item.productId, status: "ACTIVE", isActive: true },
        include: { variants: { where: { isActive: true }, include: { inventory: true } } },
      });
      if (!product) return NextResponse.json({ error: "One of the products is no longer available." }, { status: 409 });

      const prices = product.packPricing && typeof product.packPricing === "object"
        ? product.packPricing as Record<string, unknown>
        : {};
      const configuredPrice = Number(prices[String(item.packSize)] ?? (item.packSize === 1 ? product.price : NaN));
      if (!Number.isFinite(configuredPrice) || configuredPrice <= 0) {
        return NextResponse.json({ error: "This pack size is not configured for " + product.name + "." }, { status: 400 });
      }

      const breakdown = Array.isArray(item.sizeBreakdown) ? item.sizeBreakdown : [];
      const allocated = breakdown.reduce((sum, size) => sum + (Number(size.quantity) || 0), 0);
      if (allocated !== item.packSize || breakdown.some((size) => !clean(size.size, 40) || !Number.isInteger(size.quantity) || size.quantity < 0)) {
        return NextResponse.json({ error: "Size quantities for " + product.name + " must add up to the selected pack." }, { status: 400 });
      }

      for (const size of breakdown.filter((entry) => entry.quantity > 0)) {
        if (size.variantId) {
          const variant = product.variants.find((entry) => entry.id === size.variantId);
          if (!variant) return NextResponse.json({ error: "A selected size for " + product.name + " is unavailable." }, { status: 409 });
          const available = variant.inventory
            ? Math.max(0, variant.inventory.quantity - variant.inventory.reserved)
            : Math.max(0, variant.stock);
          if (available < size.quantity) return NextResponse.json({ error: "Insufficient stock for " + product.name + " (" + size.size + ")." }, { status: 409 });
        }
      }

      prepared.push({
        product,
        price: configuredPrice,
        quantity: item.packSize,
        customization: {
          packSize: item.packSize,
          color: clean(item.color, 80),
          sizeBreakdown: breakdown,
          frontImageUrl: clean(item.frontImageUrl, 1000),
          backImageUrl: clean(item.backImageUrl, 1000),
          customizationNotes: clean(item.customizationNotes, 1000),
        },
      });
    }

    const subtotal = prepared.reduce((sum, item) => sum + item.price, 0);
    const customer = await prisma.customer.upsert({
      where: { email },
      update: { firstName: customerName.split(" ")[0], lastName: customerName.split(" ").slice(1).join(" ") || null, phone },
      create: { email, firstName: customerName.split(" ")[0], lastName: customerName.split(" ").slice(1).join(" ") || null, phone },
    });

    const orderNumber = "HU-" + Date.now().toString(36).toUpperCase() + "-" + randomBytes(3).toString("hex").toUpperCase();
    const address = { fullName: customerName, email, phone, whatsapp, addressLine1, addressLine2, city, state, postalCode, country: "India" };
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        subtotal,
        totalAmount: subtotal,
        shippingAddress: address,
        notes: notes || null,
        status: "PENDING",
        paymentStatus: "PENDING",
        items: {
          create: prepared.map(({ product, price, quantity, customization }) => ({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantity,
            unitPrice: price,
            totalPrice: price,
            customization,
          })),
        },
        payment: { create: { method: "COD", status: "PENDING", amount: subtotal } },
        shipment: { create: { status: "PENDING" } },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, order: { id: order.id, orderNumber: order.orderNumber, totalAmount: Number(order.totalAmount) } }, { status: 201 });
  } catch (error) {
    console.error("Checkout order creation failed:", error);
    return NextResponse.json({ error: "Unable to place your order right now. Please try again." }, { status: 500 });
  }
}
