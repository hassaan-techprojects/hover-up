import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 100);
  if (!ids.length) return NextResponse.json({ products: [] });
  try {
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, status: "ACTIVE", isActive: true },
      select: { id: true, name: true, slug: true, price: true, comparePrice: true, images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true } } },
    });
    const order = new Map(ids.map((id, index) => [id, index]));
    products.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
    return NextResponse.json({ products });
  } catch (error) {
    console.error("Wishlist products failed:", error);
    return NextResponse.json({ error: "Unable to load wishlist." }, { status: 500 });
  }
}
