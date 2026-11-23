import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type CheckoutItem = {
  productId: string;
  quantity: number;
  packSize?: number;
  color?: string | null;
  sizeBreakdown?: Array<{ size: string; quantity: number; variantId?: string | null }>;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  customizationNotes?: string | null;
  variantId?: string | null;
  variantName?: string | null;
};

function clean(value: unknown, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = clean(body.email, 254).toLowerCase();
    const fullName = clean(body.fullName, 160);
    const phone = clean(body.phone, 24);
    const whatsapp = clean(body.whatsapp, 24);
    const addressLine1 = clean(body.addressLine1, 240);
    const addressLine2 = clean(body.addressLine2, 240);
    const city = clean(body.city, 100);
    const state = clean(body.state, 100);
    const postalCode = clean(body.postalCode, 12);
    const notes = clean(body.notes, 1000);
    const items = body.items as CheckoutItem[];

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!fullName || !phone || !addressLine1 || !city || !state || !postalCode) {
      return NextResponse.json({ error: "Complete all required contact and delivery fields." }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
      return NextResponse.json({ error: "Your cart is empty or contains too many items." }, { status: 400 });
    }
    if ((body.paymentMethod || "COD") !== "COD") {
      return NextResponse.json({ error: "Online payment will be available soon. Please choose Cash on Delivery." }, { status: 400 });
    }

    const prepared = [];
    let subtotal = 0;

    for (const item of items) {
      const productId = clean(item.productId, 100);
      const quantity = Number(item.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
        return NextResponse.json({ error: "A cart item has an invalid quantity." }, { status: 400 });
      }

      const product = await prisma.product.findFirst({
        where: { id: productId, status: "ACTIVE", isActive: true },
        include: { variants: { where: { isActive: true }, include: { inventory: true } }, inventories: { where: { variantId: null } } },
      });
      if (!product) {
        return NextResponse.json({ error: "A product in your cart is no longer available." }, { status: 409 });
      }

      let linePrice: number;
      if (item.packSize) {
        const packSize = Number(item.packSize);
        if (!Number.isInteger(packSize) || packSize !== quantity) {
          return NextResponse.json({ error: "Pack quantity does not match the selected pack." }, { status: 400 });
        }
        const pricing = product.packPricing && typeof product.packPricing === "object" && !Array.isArray(product.packPricing) ? product.packPricing as unknown as Record<string, unknown> : null;
        const configuredPrice = pricing?.[String(packSize)];
        linePrice = Number(configuredPrice);
        if (!Number.isFinite(linePrice) || linePrice <= 0) {
          return NextResponse.json({ error: `Pack of ${packSize} is not configured for ${product.name} yet.` }, { status: 400 });
        }
        const breakdown = Array.isArray(item.sizeBreakdown) ? item.sizeBreakdown : [];
        const allocated = breakdown.reduce((sum, size) => sum + Number(size.quantity || 0), 0);
        if (allocated !== packSize || breakdown.some((size) => !clean(size.size, 30) || !Number.isInteger(Number(size.quantity)) || Number(size.quantity) < 1)) {
          return NextResponse.json({ error: "Size quantities must add up exactly to the selected pack." }, { status: 400 });
        }
        for (const size of breakdown) {
          if (!size.variantId) continue;
          const variant = product.variants.find((candidate) => candidate.id === size.variantId);
          if (!variant) return NextResponse.json({ error: "A selected size or color is no longer available." }, { status: 409 });
          const stock = variant.inventory ? Math.max(0, variant.inventory.quantity - variant.inventory.reserved) : variant.stock;
          if (stock < Number(size.quantity)) return NextResponse.json({ error: `Insufficient stock for size ${size.size}.` }, { status: 409 });
        }
      } else {
        const variant = item.variantId ? product.variants.find((candidate) => candidate.id === item.variantId) : null;
        if (item.variantId && !variant) return NextResponse.json({ error: "A selected product option is no longer available." }, { status: 409 });
        linePrice = Number(variant?.price ?? product.price);
        if (!Number.isFinite(linePrice) || linePrice <= 0) return NextResponse.json({ error: "Invalid product price." }, { status: 400 });
        if (variant) {
          const stock = variant.inventory ? Math.max(0, variant.inventory.quantity - variant.inventory.reserved) : variant.stock;
          if (stock < quantity) return NextResponse.json({ error: "Insufficient stock for a selected product." }, { status: 409 });
        }
      }

      subtotal += linePrice;
      prepared.push({ item, product, linePrice });
    }

    const [firstName, ...lastParts] = fullName.split(/\s+/);
    const customer = await prisma.customer.upsert({
      where: { email },
      update: { firstName, lastName: lastParts.join(" ") || null, phone },
      create: { firstName, lastName: lastParts.join(" ") || null, email, phone },
    });

    const orderNumber = `HU-${Date.now().toString().slice(-8)}-${randomBytes(2).toString("hex").toUpperCase()}`;
    const shippingAddress = {
      fullName, email, phone, whatsapp: whatsapp || phone,
      addressLine1, addressLine2, city, state, postalCode, country: "India",
    };

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          status: "PENDING",
          paymentStatus: "PENDING",
          subtotal,
          discountAmount: 0,
          shippingAmount: 0,
          taxAmount: 0,
          totalAmount: subtotal,
          shippingAddress,
          billingAddress: shippingAddress,
          notes: notes || null,
          items: {
            create: prepared.map(({ item, product, linePrice }) => ({
              productId: product.id,
              productName: product.name,
              variantId: item.variantId || null,
              variantName: item.color || item.variantName || null,
              sku: product.sku,
              quantity: Number(item.quantity),
              unitPrice: linePrice / Number(item.quantity),
              totalPrice: linePrice,
              customization: {
                packSize: item.packSize || null,
                color: item.color || null,
                sizeBreakdown: item.sizeBreakdown || [],
                frontImageUrl: item.frontImageUrl || null,
                backImageUrl: item.backImageUrl || null,
                customizationNotes: item.customizationNotes || null,
              },
            })),
          },
          payment: {
            create: { method: "COD", status: "PENDING", amount: subtotal, gateway: "CASH_ON_DELIVERY" },
          },
          shipment: { create: { status: "PENDING" } },
        },
        include: { items: true },
      });
      return created;
    });

    return NextResponse.json({
      success: true,
      order: { id: order.id, orderNumber: order.orderNumber, totalAmount: Number(order.totalAmount) },
      customerId: customer.id,
    }, { status: 201 });
  } catch (error) {
    console.error("Checkout order creation failed:", error);
    return NextResponse.json({ error: "We could not place your order. Please try again." }, { status: 500 });
  }
}
