import { NextResponse } from "next/server";
import { getDashboardAdmin } from "@/lib/dashboard-admin";
import { prisma } from "@/lib/prisma";

const SIZE_KEYS = ["S", "M", "L", "XL", "XXL"] as const;
type SizeKey = (typeof SIZE_KEYS)[number];

function validate(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  const packSize = Number(body.packSize);
  const rawSizes = body.sizes && typeof body.sizes === "object" ? body.sizes as Record<string, unknown> : {};
  const sizes = {} as Record<SizeKey, number>;
  for (const key of SIZE_KEYS) {
    const value = Number(rawSizes[key] ?? 0);
    if (!Number.isSafeInteger(value) || value < 0 || value > 1000000) return { error: `Enter a valid quantity for size ${key}.` } as const;
    sizes[key] = value;
  }
  if (!name) return { error: "Enter a name for this stock sheet." } as const;
  if (!Number.isInteger(packSize) || packSize < 2 || packSize > 100) return { error: "Pack size must be between 2 and 100." } as const;
  const amountText = body.totalAmount == null || body.totalAmount === "" ? null : String(body.totalAmount);
  if (amountText !== null && (!/^\d{1,10}(\.\d{1,2})?$/.test(amountText) || Number(amountText) < 0)) return { error: "Enter a valid total amount." } as const;
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 1000) : null;
  return { value: { name, packSize, sizes, totalAmount: amountText, notes } } as const;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await params;
    const parsed = validate(await request.json());
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const existing = await prisma.stockPlanningSheet.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Stock sheet not found." }, { status: 404 });
    const sheet = await prisma.stockPlanningSheet.update({
      where: { id },
      data: { ...parsed.value, totalAmount: parsed.value.totalAmount === null ? null : parsed.value.totalAmount },
    });
    await prisma.activityLog.create({
      data: { userId: auth.user.id, action: "STOCK_PLAN_UPDATED", entity: "STOCK_PLAN", entityId: sheet.id, description: `Updated internal stock sheet: ${sheet.name}.` },
    });
    return NextResponse.json({ sheet });
  } catch (error) {
    console.error("Stock planner update error:", error);
    return NextResponse.json({ error: "Unable to save stock sheet." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await params;
    const existing = await prisma.stockPlanningSheet.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!existing) return NextResponse.json({ error: "Stock sheet not found." }, { status: 404 });
    await prisma.$transaction([
      prisma.activityLog.create({
        data: { userId: auth.user.id, action: "STOCK_PLAN_DELETED", entity: "STOCK_PLAN", entityId: existing.id, description: `Deleted internal stock sheet: ${existing.name}.` },
      }),
      prisma.stockPlanningSheet.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Stock planner delete error:", error);
    return NextResponse.json({ error: "Unable to delete stock sheet." }, { status: 500 });
  }
}
