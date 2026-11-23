import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SIZES = ["S", "M", "L", "XL", "2XL"] as const;
async function adminOnly() {
  const session = await getServerSession(authOptions);
  return session?.user?.id && session.user.role === "ADMIN" ? session : null;
}
export async function GET() {
  try {
    if (!(await adminOnly())) return NextResponse.json({ error: "Only administrators can access the stock worksheet." }, { status: 403 });
    const saved = await prisma.stockWorksheet.findMany({ where: { size: { in: [...SIZES] } }, orderBy: { size: "asc" } });
    const rows = SIZES.map(size => {
      const row = saved.find(item => item.size === size);
      return { size, totalPacks: row?.totalPacks ?? 0, piecesPerPack: row?.piecesPerPack ?? 0, totalPieces: (row?.totalPacks ?? 0) * (row?.piecesPerPack ?? 0) };
    });
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("Stock worksheet GET error:", error);
    return NextResponse.json({ error: "Unable to load stock worksheet." }, { status: 500 });
  }
}
export async function PUT(request: Request) {
  try {
    const session = await adminOnly();
    if (!session) return NextResponse.json({ error: "Only administrators can update the stock worksheet." }, { status: 403 });
    const body = await request.json() as { rows?: { size: string; totalPacks: number; piecesPerPack: number }[] };
    if (!Array.isArray(body.rows) || body.rows.length !== SIZES.length) return NextResponse.json({ error: "Submit all five size rows." }, { status: 400 });
    for (const row of body.rows) {
      if (!SIZES.includes(row.size as typeof SIZES[number]) || !Number.isInteger(row.totalPacks) || row.totalPacks < 0 || !Number.isInteger(row.piecesPerPack) || row.piecesPerPack < 0) {
        return NextResponse.json({ error: "Enter valid whole-number pack and piece quantities for each size." }, { status: 400 });
      }
    }
    await prisma.$transaction(body.rows.map(row => prisma.stockWorksheet.upsert({
      where: { size: row.size },
      update: { totalPacks: row.totalPacks, piecesPerPack: row.piecesPerPack },
      create: { size: row.size, totalPacks: row.totalPacks, piecesPerPack: row.piecesPerPack },
    })));
    await prisma.activityLog.create({
      data: { userId: session.user.id, action: "STOCK_WORKSHEET_UPDATED", entity: "STOCK_WORKSHEET", description: "The independent stock worksheet was updated." },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Stock worksheet update error:", error);
    return NextResponse.json({ error: "Unable to save stock worksheet." }, { status: 500 });
  }
}
