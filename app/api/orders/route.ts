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

type ProductSizeOption = {
  value: string;
  sizeSymbol?: string;
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
