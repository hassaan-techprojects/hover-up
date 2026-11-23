import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PACK_PRICES: Record<number, number> = {
  2: 1399,
  5: 3250,
  10: 6250,
  15: 9100,
  20: 11700,
  50: 27600,
  75: 39100,
  100: 50100,
};

type SizeAllocation = {
  size: string;
  quantity: number;
  variantId?: string | null;
};

type CheckoutItem = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  packSize?: number;
  color?: string;
  sizeBreakdown?: SizeAllocation[];
  frontImageUrl?: string;
  backImageUrl?: string;
  textOnlyDesign?: boolean;
  customizationNotes?: string;
};

type CheckoutBody = {
  customer: {
    firstName: string;
    lastName?: string;
    email: string;
    phone: string;
    whatsappPhone?: string;
  };
  address: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  items: CheckoutItem[];
  paymentMethod: "COD" | "ONLINE";
};

function responseError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getJsonValues(value: unknown): string[] {
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(getJsonValues);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(getJsonValues);
  }
  return [];
}

function isValidArtworkUrl(value: string | undefined) {
  if (!value) return false;
  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.replace(/\/+$/, "");
  const bucket = process.env.NEON_STORAGE_BUCKET;
  if (!endpoint || !bucket) return false;
  return value.startsWith(`${endpoint}/${bucket}/customizations/`);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CheckoutBody;
    const customer = body.customer;
    const address = body.address;
    const items = body.items;

    if (!customer?.firstName?.trim() || !customer.email?.trim() || !customer.phone?.trim()) {
      return responseError("Name, email address, and contact number are required.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
      return responseError("Enter a valid email address.");
    }
    if (!address?.addressLine1?.trim() || !address.city?.trim() || !address.state?.trim() || !address.postalCode?.trim()) {
      return responseError("Complete your delivery address before placing the order.");
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
      return responseError("Your shopping bag is empty or contains too many items.");
    }
    if (body.paymentMethod !== "COD" && body.paymentMethod !== "ONLINE") {
      return responseError("Choose a valid payment method.");
    }

    const orderLines: {
      productId: string;
      variantId: string | null;
      productName: string;
      variantName: string | null;
      sku: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      customization?: Record<string, unknown>;
    }[] = [];

    let subtotal = 0;

    for (const item of items) {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return responseError("One of the items in your bag is invalid.");
      }

      const product = await prisma.product.findFirst({
        where: { id: item.productId, status: "ACTIVE", isActive: true },
        include: {
          attributes: { include: { attributeValue: true } },
          variants: {
            where: { isActive: true },
            include: { inventory: true },
          },
          inventories: { where: { variantId: null } },
        },
      });

      if (!product) return responseError("A product in your bag is no longer available.", 409);

      const configuredProductSizes = product.attributes
        .map((entry) => entry.attributeValue)
        .filter((value) => value.termType === "SIZE");
      const canonicalPackSizes = [
        { value: "41", sizeSymbol: "S" },
        { value: "43", sizeSymbol: "M" },
        { value: "45", sizeSymbol: "L" },
        { value: "47", sizeSymbol: "XL" },
        { value: "49", sizeSymbol: "2XL" },
      ];
      const productSizes = [...canonicalPackSizes, ...configuredProductSizes];
      const productColors = product.attributes
        .map((entry) => entry.attributeValue)
        .filter((value) => value.termType === "COLOR");

      if (item.packSize) {
        const packPrice = PACK_PRICES[item.packSize];
        if (!packPrice || item.quantity !== item.packSize) {
          return responseError(`The selected pack for ${product.name} is invalid.`);
        }
        if (!Array.isArray(item.sizeBreakdown) || item.sizeBreakdown.length === 0) {
          return responseError(`Select sizes for ${product.name} before checkout.`);
        }

        const allocated = item.sizeBreakdown.reduce((sum, size) => sum + Number(size.quantity || 0), 0);
        if (allocated !== item.packSize || item.sizeBreakdown.some((size) => !Number.isInteger(size.quantity) || size.quantity < 0)) {
          return responseError(`Size quantities for ${product.name} must add up to exactly ${item.packSize}.`);
        }

        if (productSizes.length === 0) {
          return responseError(`Size options are not configured for ${product.name}.`);
        }

        const stockTracked =
          product.inventories.length > 0 ||
          product.variants.some((variant) => Boolean(variant.inventory) || variant.stock > 0);

        if (stockTracked && product.variants.length === 0 && product.inventories.length > 0) {
          const availableProductStock = product.inventories.reduce(
            (sum, inventory) => sum + Math.max(0, inventory.quantity - inventory.reserved),
            0
          );
          if (availableProductStock < item.packSize) {
            return responseError(`Only ${availableProductStock} item(s) are available for ${product.name}.`, 409);
          }
        }

        if (productColors.length > 0 && !productColors.some((color) => color.value.toLowerCase() === (item.color || "").toLowerCase())) {
          return responseError(`Choose a valid color for ${product.name}.`);
        }

        if (item.textOnlyDesign) {
          if (!(item.customizationNotes || "").trim()) {
            return responseError("Add the text or design instructions for your text-only order.");
          }
          if ((item.frontImageUrl && !isValidArtworkUrl(item.frontImageUrl)) || (item.backImageUrl && !isValidArtworkUrl(item.backImageUrl))) {
            return responseError("One of the uploaded logo files is invalid.");
          }
        } else if (
          (item.frontImageUrl && !isValidArtworkUrl(item.frontImageUrl)) ||
          (item.backImageUrl && !isValidArtworkUrl(item.backImageUrl))
        ) {
          return responseError("One of the uploaded logo files is invalid.");
        }

        const activeAllocations = item.sizeBreakdown.filter((size) => size.quantity > 0);
        for (const allocation of activeAllocations) {
          const sizeTerm = productSizes.find((size) => size.value === allocation.size || size.sizeSymbol === allocation.size);
          if (!sizeTerm) return responseError(`Size ${allocation.size} is not available for ${product.name}.`);

          // A pack can be ordered without a matching SKU variant. When a
          // variant is supplied, validate it; otherwise retain the size in
          // the order customization instead of rejecting the entire pack.
          if (allocation.variantId) {
            const variant = product.variants.find((entry) => entry.id === allocation.variantId);
            if (!variant) return responseError(`The selected size ${allocation.size} is unavailable for ${product.name}.`, 409);

            const values = getJsonValues(variant.attributes).map((value) => value.toLowerCase());
            const matchesSize = values.includes(sizeTerm.value.toLowerCase()) ||
              Boolean(sizeTerm.sizeSymbol && values.includes(sizeTerm.sizeSymbol.toLowerCase()));
            const matchesColor = !item.color || values.includes(item.color.toLowerCase());
            if (!matchesSize || !matchesColor) {
              return responseError(`The selected variant for size ${allocation.size} does not match your options.`);
            }

            const stock = variant.inventory
              ? Math.max(0, variant.inventory.quantity - variant.inventory.reserved)
              : Math.max(0, variant.stock);
            if (stockTracked && stock < allocation.quantity) {
              return responseError(`Only ${stock} item(s) are available in size ${allocation.size}.`, 409);
            }
          }
        }

        const unitPrice = packPrice / item.packSize;
        orderLines.push({
          productId: product.id,
          variantId: null,
          productName: product.name,
          variantName: item.color || null,
          sku: product.sku,
          quantity: item.packSize,
          unitPrice,
          totalPrice: packPrice,
          customization: {
            packSize: item.packSize,
            color: item.color || null,
            sizeBreakdown: activeAllocations,
            frontImageUrl: item.frontImageUrl || null,
            backImageUrl: item.backImageUrl || null,
            textOnlyDesign: Boolean(item.textOnlyDesign),
            customizationNotes: (item.customizationNotes || "").trim().slice(0, 1000),
          },
        });
        subtotal += packPrice;
      } else {
        const variant = item.variantId
          ? product.variants.find((entry) => entry.id === item.variantId)
          : null;
        if (item.variantId && !variant) return responseError(`A selected option for ${product.name} is no longer available.`, 409);

        const unitPrice = Number(variant?.price ?? product.price);
        const stock = variant
          ? variant.inventory
            ? Math.max(0, variant.inventory.quantity - variant.inventory.reserved)
            : Math.max(0, variant.stock)
          : product.inventories?.[0]?.quantity ?? 0;
        const stockTracked =
          product.inventories.length > 0 ||
          product.variants.some((entry) => Boolean(entry.inventory) || entry.stock > 0);
        if (stockTracked && stock < item.quantity) {
          return responseError(`Only ${stock} item(s) are available for ${product.name}.`, 409);
        }

        orderLines.push({
          productId: product.id,
          variantId: variant?.id ?? null,
          productName: product.name,
          variantName: variant?.name ?? null,
          sku: variant?.sku ?? product.sku,
          quantity: item.quantity,
          unitPrice,
          totalPrice: unitPrice * item.quantity,
        });
        subtotal += unitPrice * item.quantity;
      }
    }

    const fullName = address.fullName?.trim() || [customer.firstName, customer.lastName].filter(Boolean).join(" ");
    const shippingAddress = {
      fullName,
      email: customer.email.trim().toLowerCase(),
      phone: customer.phone.trim(),
      whatsappPhone: customer.whatsappPhone?.trim() || customer.phone.trim(),
      addressLine1: address.addressLine1.trim(),
      addressLine2: address.addressLine2?.trim() || "",
      city: address.city.trim(),
      state: address.state.trim(),
      postalCode: address.postalCode.trim(),
      country: address.country?.trim() || "India",
    };

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (body.paymentMethod === "ONLINE" && (!keyId || !keySecret)) {
      return responseError("Online payment is not configured yet. Please choose Cash on Delivery or contact the store.", 503);
    }

    const orderNumber = `HU-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const session = await getServerSession(authOptions);

    const order = await prisma.$transaction(async (tx) => {
      const signedInCustomer = session?.user?.role === "CUSTOMER"
        ? await tx.customer.findUnique({ where: { userId: session.user.id } })
        : null;

      const savedCustomer = signedInCustomer
        ? await tx.customer.update({
            where: { id: signedInCustomer.id },
            data: {
              firstName: customer.firstName.trim(),
              lastName: customer.lastName?.trim() || null,
              phone: customer.phone.trim(),
            },
          })
        : await tx.customer.upsert({
            where: { email: customer.email.trim().toLowerCase() },
            update: {
              firstName: customer.firstName.trim(),
              lastName: customer.lastName?.trim() || null,
              phone: customer.phone.trim(),
            },
            create: {
              firstName: customer.firstName.trim(),
              lastName: customer.lastName?.trim() || null,
              email: customer.email.trim().toLowerCase(),
              phone: customer.phone.trim(),
            },
          });

      const existingAddress = await tx.address.findFirst({
        where: {
          customerId: savedCustomer.id,
          addressLine1: address.addressLine1.trim(),
          postalCode: address.postalCode.trim(),
        },
        select: { id: true },
      });
      if (!existingAddress) {
        const addressCount = await tx.address.count({ where: { customerId: savedCustomer.id } });
        await tx.address.create({
          data: {
            customerId: savedCustomer.id,
            fullName,
            phone: customer.phone.trim(),
            addressLine1: address.addressLine1.trim(),
            addressLine2: address.addressLine2?.trim() || null,
            city: address.city.trim(),
            state: address.state.trim(),
            postalCode: address.postalCode.trim(),
            country: address.country?.trim() || "India",
            isDefault: addressCount === 0,
          },
        });
      }

      return tx.order.create({
        data: {
          orderNumber,
          customerId: savedCustomer.id,
          status: "PENDING",
          paymentStatus: "PENDING",
          subtotal,
          discountAmount: 0,
          shippingAmount: 0,
          taxAmount: 0,
          totalAmount: subtotal,
          shippingAddress,
          notes: customer.whatsappPhone ? `WhatsApp: ${customer.whatsappPhone.trim()}` : null,
          items: {
            create: orderLines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              productName: line.productName,
              variantName: line.variantName,
              sku: line.sku,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              totalPrice: line.totalPrice,
              customization: line.customization as never,
            })),
          },
          payment: {
            create: {
              method: body.paymentMethod === "COD" ? "COD" : "UPI",
              status: "PENDING",
              amount: subtotal,
              gateway: body.paymentMethod === "ONLINE" ? "RAZORPAY" : null,
            },
          },
        },
        select: { id: true, orderNumber: true, totalAmount: true },
      });
    });

    if (body.paymentMethod === "ONLINE") {
      const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(subtotal * 100),
          currency: "INR",
          receipt: order.orderNumber,
          notes: { hoverUpOrderId: order.id },
        }),
      });

      const razorpayOrder = await razorpayResponse.json();
      if (!razorpayResponse.ok) {
        console.error("Razorpay order creation failed:", razorpayOrder);
        return responseError("Unable to start online payment. Your order is saved as pending; contact the store before retrying.", 502);
      }

      await prisma.payment.update({
        where: { orderId: order.id },
        data: { transactionId: razorpayOrder.id, gateway: "RAZORPAY" },
      });

      return NextResponse.json({
        order,
        payment: {
          provider: "RAZORPAY",
          keyId,
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
        },
      }, { status: 201 });
    }

    return NextResponse.json({ order, payment: { provider: "COD" } }, { status: 201 });
  } catch (error) {
    console.error("Create order API error:", error);
    return NextResponse.json({ error: "Unable to place your order. Please try again." }, { status: 500 });
  }
}
