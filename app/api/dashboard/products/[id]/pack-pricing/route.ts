import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardAdmin } from "@/lib/dashboard-admin";

type Context = { params: Promise<{ id: string }> };
const PACK_OPTIONS = [2, 5, 10, 15, 20, 50, 75, 100];

export async function GET(_request: Request, { params }: Context) {
  const auth = await getDashboardAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true, packPricing: true } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(request: Request, { params }: Context) {
  const auth = await getDashboardAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { id } = await params;
    const body = await request.json();
    const input = body.packPricing;
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return NextResponse.json({ error: "Submit pack prices as a pack-size to price object." }, { status: 400 });
    }
    const pricing: Record<string, number> = {};
    for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
      const pack = Number(key), price = Number(raw);
      if (!PACK_OPTIONS.includes(pack) || !Number.isFinite(price) || price <= 0) {
        return NextResponse.json({ error: "Use supported pack sizes (2, 5, 10, 15, 20, 50, 75, 100) and enter a price above zero." }, { status: 400 });
      }
      pricing[String(pack)] = Math.round(price * 100) / 100;
    }
    if (Object.keys(pricing).length === 0) {
      return NextResponse.json({ error: "Add at least one pack price." }, { status: 400 });
    }
    const product = await prisma.product.update({ where: { id }, data: { packPricing: pricing }, select: { id: true, name: true, packPricing: true } });
    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Pack pricing update failed:", error);
    return NextResponse.json({ error: "Unable to save pack pricing." }, { status: 500 });
  }
}
