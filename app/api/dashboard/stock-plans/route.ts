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

export async function GET() {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const sheets = await prisma.stockPlanningSheet.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ sheets });
  } catch (error) {
    console.error("Stock planner list error:", error);
    return NextResponse.json({ error: "Unable to load stock sheets." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const parsed = validate(await request.json());
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const sheet = await prisma.stockPlanningSheet.create({
      data: { ...parsed.value, totalAmount: parsed.value.totalAmount === null ? null : parsed.value.totalAmount },
    });
    await prisma.activityLog.create({
      data: { userId: auth.user.id, action: "STOCK_PLAN_CREATED", entity: "STOCK_PLAN", entityId: sheet.id, description: `Created internal stock sheet: ${sheet.name}.` },
    });
    return NextResponse.json({ sheet });
  } catch (error) {
    console.error("Stock planner create error:", error);
    return NextResponse.json({ error: "Unable to create stock sheet." }, { status: 500 });
  }
}
