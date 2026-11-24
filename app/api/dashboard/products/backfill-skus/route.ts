import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getDashboardAdmin } from "@/lib/dashboard-admin";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const products = await prisma.product.findMany({ where: { sku: null }, select: { id: true } });
    let updated = 0;
    for (const product of products) {
      let sku = "";
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate = "HU-" + parseInt(randomUUID().replace(/-/g, "").slice(0, 8), 16).toString(36).toUpperCase().padStart(5, "0").slice(-5);
        const exists = await prisma.product.findUnique({ where: { sku: candidate }, select: { id: true } });
        if (!exists) { sku = candidate; break; }
      }
      if (!sku) continue;
      await prisma.product.updateMany({ where: { id: product.id, sku: null }, data: { sku } });
      updated += 1;
    }
    if (updated) {
      await prisma.activityLog.create({
        data: { userId: auth.user.id, action: "PRODUCT_SKUS_GENERATED", entity: "PRODUCT", description: "Generated missing product SKUs", metadata: { updated } },
      });
    }
    return NextResponse.json({ updated });
  } catch (error) {
    console.error("Product SKU backfill error:", error);
    return NextResponse.json({ error: "Unable to generate missing product SKUs." }, { status: 500 });
  }
}
