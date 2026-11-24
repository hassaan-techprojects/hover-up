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

const STANDARD_SIZES = ["S", "M", "L", "XL", "2XL"] as const;

const CANONICAL_SIZE_BY_VALUE: Record<string, string> = {
  "41": "S",
  "43": "M",
  "45": "L",
  "47": "XL",
  "49": "2XL",
};

type SizeAllocation = {
  size: string;
  quantity: number;
  variantId?: string | null;
};

type ProductSize = {
  value: string;
  sizeSymbol?: string | null;
};

type CheckoutItem = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  size?: string;
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
  if (typeof value === "string" || typeof value === "number") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap(getJsonValues);
  }
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

function getPackPrice(packPricing: unknown, packSize: number): number | null {
  if (!packPricing || typeof packPricing !== "object" || Array.isArray(packPricing)) {
    return null;
  }
  const rawPrice = (packPricing as Record<string, unknown>)[String(packSize)];
  const price =
    typeof rawPrice === "number"
      ? rawPrice
      : typeof rawPrice === "string"
        ? Number(rawPrice)
        : Number.NaN;
  return Number.isFinite(price) && price > 0 ? price : null;
}

function getSizeAliases(size: ProductSize): string[] {
  const value = String(size.value).trim();
  const symbol = size.sizeSymbol?.trim() || "";
  const canonical = CANONICAL_SIZE_BY_VALUE[value] || "";
  return [...new Set([value, symbol, canonical].filter(Boolean).map((entry) => entry.toUpperCase()))];
}

function sizeMatches(size: ProductSize, selectedSize: string): boolean {
  return getSizeAliases(size).includes(selectedSize.trim().toUpperCase());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const customer = body.customer;
    const address = body.address;
    const items = body.items;

    if (!customer?.firstName?.trim() || !customer.email?.trim() || !customer.phone?.trim()) {
      return responseError("Name, email address, and contact number are required.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
      return responseError("Enter a valid email address.");
    }
    if (
      !address?.addressLine1?.trim() ||
      !address.city?.trim() ||
      !address.state?.trim() ||
      !address.postalCode?.trim()
    ) {
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
          variants: { where: { isActive: true }, include: { inventory: true } },
          inventories: { where: { variantId: null } },
        },
      });

      if (!product) {
        return responseError("A product in your bag is no longer available.", 409);
      }

      const productSizes = product.attributes
        .map((entry) => entry.attributeValue)
        .filter((value) => value.termType === "SIZE") as ProductSize[];
      const productColors = product.attributes
        .map((entry) => entry.attributeValue)
        .filter((value) => value.termType === "COLOR");

      const hasSizeVariants = product.variants.some((variant) => {
        const values = getJsonValues(variant.attributes).map((value) => value.toUpperCase());
        return productSizes.some((size) => getSizeAliases(size).some((alias) => values.includes(alias)));
      });

      if (item.packSize !== undefined && item.packSize !== null) {
        if (!Number.isInteger(item.packSize) || item.packSize < 1) {
          return responseError(`The selected pack size for ${product.name} is invalid.`);
        }

        const packPrice = getPackPrice(product.packPricing, item.packSize) ?? PACK_PRICES[item.packSize] ?? null;
        if (packPrice === null || item.quantity !== item.packSize) {
          return responseError(`The selected pack for ${product.name} is not configured or is invalid.`);
        }
        if (!Array.isArray(item.sizeBreakdown) || item.sizeBreakdown.length === 0) {
          return responseError(`Select sizes for ${product.name} before checkout.`);
        }
        if (
          item.sizeBreakdown.some(
            (size) => !size.size || !Number.isInteger(size.quantity) || size.quantity < 0
          )
        ) {
          return responseError(`Size quantities for ${product.name} are invalid.`);
        }

        const allocated = item.sizeBreakdown.reduce((sum, size) => sum + size.quantity, 0);
        if (allocated !== item.packSize) {
          return responseError(
            `Size quantities for ${product.name} must add up to exactly ${item.packSize}.`
          );
        }

        if (product.variants.length === 0 && product.inventories.length > 0) {
          const availableProductStock = product.inventories.reduce(
            (sum, inventory) => sum + Math.max(0, inventory.quantity - inventory.reserved),
            0
          );
          if (availableProductStock < item.packSize) {
            return responseError(
              `Only ${availableProductStock} item(s) are available for ${product.name}.`,
              409
            );
          }
        }

        if (
          productColors.length > 0 &&
          !productColors.some((color) => color.value.toLowerCase() === (item.color || "").toLowerCase())
        ) {
          return responseError(`Choose a valid color for ${product.name}.`);
        }

        if (item.textOnlyDesign && !(item.customizationNotes || "").trim()) {
          return responseError("Add the text or design instructions for your text-only order.");
        }
        if (
          (item.frontImageUrl && !isValidArtworkUrl(item.frontImageUrl)) ||
          (item.backImageUrl && !isValidArtworkUrl(item.backImageUrl))
        ) {
          return responseError("One of the uploaded logo files is invalid.");
        }

        if (product.variants.length > 0 && !hasSizeVariants) {
          const colorVariant = product.variants.find((variant) => {
            const values = getJsonValues(variant.attributes).map((value) => value.toLowerCase());
            return !item.color || values.includes(item.color.toLowerCase());
          });
          if (!colorVariant) {
            return responseError(`The selected color is unavailable for ${product.name}.`, 409);
          }
          const stock = colorVariant.inventory
            ? Math.max(0, colorVariant.inventory.quantity - colorVariant.inventory.reserved)
            : Math.max(0, colorVariant.stock);
          if (stock < item.packSize) {
            return responseError(`Only ${stock} item(s) are available for ${product.name}.`, 409);
          }
        }

        const activeAllocations = item.sizeBreakdown.filter((size) => size.quantity > 0);
        for (const allocation of activeAllocations) {
          const sizeTerm = productSizes.find((size) => sizeMatches(size, allocation.size));
          const validStandardSize =
            productSizes.length === 0 &&
            STANDARD_SIZES.includes(allocation.size.toUpperCase() as (typeof STANDARD_SIZES)[number]);
          if (!sizeTerm && !validStandardSize) {
            return responseError(`Size ${allocation.size} is not available for ${product.name}.`);
          }

          if (product.variants.length > 0 && hasSizeVariants) {
            const variant = product.variants.find((entry) => entry.id === allocation.variantId);
            if (!variant || !sizeTerm) {
              return responseError(
                `The selected size ${allocation.size} is unavailable for ${product.name}.`,
                409
              );
            }
            const values = getJsonValues(variant.attributes).map((value) => value.toUpperCase());
            const matchesSize = getSizeAliases(sizeTerm).some((alias) => values.includes(alias));
            const matchesColor = !item.color || values.includes(item.color.toUpperCase());
            if (!matchesSize || !matchesColor) {
              return responseError(
                `The selected variant for size ${allocation.size} does not match your options.`
              );
            }
            const stock = variant.inventory
              ? Math.max(0, variant.inventory.quantity - variant.inventory.reserved)
              : Math.max(0, variant.stock);
            if (stock < allocation.quantity) {
              return responseError(
                `Only ${stock} item(s) are available in size ${allocation.size}.`,
                409
              );
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
        const selectedSize = item.size?.trim().toUpperCase() || "";
        if (!STANDARD_SIZES.includes(selectedSize as (typeof STANDARD_SIZES)[number])) {
          return responseError(`Choose a valid size for ${product.name}.`);
        }
        if (productSizes.length > 0 && !productSizes.some((size) => sizeMatches(size, selectedSize))) {
          return responseError(`Size ${selectedSize} is not configured for ${product.name}.`);
        }

        const variant = item.variantId
          ? product.variants.find((entry) => entry.id === item.variantId)
          : null;
        if (item.variantId && !variant) {
          return responseError(`A selected option for ${product.name} is no longer available.`, 409);
        }
        if (variant && hasSizeVariants) {
          const values = getJsonValues(variant.attributes).map((value) => value.toUpperCase());
          const sizeTerm = productSizes.find((size) => sizeMatches(size, selectedSize));
          const matchesSize = Boolean(
            sizeTerm && getSizeAliases(sizeTerm).some((alias) => values.includes(alias))
          );
          if (!matchesSize) {
            return responseError(`The selected variant does not match size ${selectedSize}.`);
          }
        }

        const unitPrice = Number(variant?.price ?? product.price);
        const stock = variant
          ? variant.inventory
            ? Math.max(0, variant.inventory.quantity - variant.inventory.reserved)
            : Math.max(0, variant.stock)
          : product.inventories?.[0]?.quantity ?? 0;
        if ((variant || product.inventories.length > 0) && stock < item.quantity) {
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
          customization: { size: selectedSize },
        });
        subtotal += unitPrice * item.quantity;
      }
    }

    const fullName =
      address.fullName?.trim() ||
      [customer.firstName, customer.lastName].filter(Boolean).join(" ");
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
      return responseError(
        "Online payment is not configured yet. Please choose Cash on Delivery or contact the store.",
        503
      );
    }

    const orderNumber = `HU-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;
    const session = await getServerSession(authOptions);

    const order = await prisma.$transaction(async (tx) => {
      const signedInCustomer =
        session?.user?.role === "CUSTOMER"
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
              ...(session?.user?.role === "CUSTOMER" ? { userId: session.user.id } : {}),
            },
            create: {
              firstName: customer.firstName.trim(),
              lastName: customer.lastName?.trim() || null,
              email: customer.email.trim().toLowerCase(),
              phone: customer.phone.trim(),
              ...(session?.user?.role === "CUSTOMER" ? { userId: session.user.id } : {}),
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

      const createdOrder = await tx.order.create({
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

      await tx.activityLog.create({
        data: {
          userId: session?.user?.id ?? null,
          action: "ORDER_PLACED",
          entity: "ORDER",
          entityId: createdOrder.id,
          description: `New order ${createdOrder.orderNumber} was placed.`,
          metadata: {
            orderNumber: createdOrder.orderNumber,
            customerId: savedCustomer.id,
            paymentMethod: body.paymentMethod,
            status: "PENDING",
          },
        },
      });
      return createdOrder;
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
        return responseError(
          "Unable to start online payment. Your order is saved as pending; contact the store before retrying.",
          502
        );
      }

      await prisma.payment.update({
        where: { orderId: order.id },
        data: { transactionId: razorpayOrder.id, gateway: "RAZORPAY" },
      });

      return NextResponse.json(
        {
          order,
          payment: {
            provider: "RAZORPAY",
            keyId,
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ order, payment: { provider: "COD" } }, { status: 201 });
  } catch (error) {
    console.error("Create order API error:", error);
    return NextResponse.json(
      { error: "Unable to place your order. Please try again." },
      { status: 500 }
    );
  }
}
