import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardAdmin } from "@/lib/dashboard-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await context.params;
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true, name: true, slug: true, sku: true, description: true,
        price: true, comparePrice: true, status: true, isActive: true,
        images: { select: { id: true, url: true, altText: true, isPrimary: true }, orderBy: { sortOrder: "asc" } },
        categories: { select: { category: { select: { id: true, name: true } } } },
      },
    });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json({ product });
  } catch (error) {
    console.error("Products GET by ID error:", error);
    return NextResponse.json({ error: "Unable to load product details." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    // Keep the existing quick enable/disable action working.
    if (Object.keys(body).length === 1 && typeof body.isActive === "boolean") {
      const product = await prisma.product.update({
        where: { id }, data: { isActive: body.isActive },
        select: { id: true, name: true, isActive: true, status: true },
      });
      return NextResponse.json({ message: "Product visibility updated.", product });
    }

    const data: {
      name?: string; slug?: string; sku?: string | null; description?: string | null;
      price?: number; comparePrice?: number | null; status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
      isActive?: boolean; publishedAt?: Date | null;
    } = {};

    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Product name is required." }, { status: 400 });
    }
    if (typeof body.slug !== "string" || !body.slug.trim()) {
      return NextResponse.json({ error: "Product permalink is required." }, { status: 400 });
    }
    const price = Number(body.price);
    const comparePrice = body.comparePrice === "" || body.comparePrice == null ? null : Number(body.comparePrice);
    if (!Number.isFinite(price) || price < 0 || (comparePrice !== null && (!Number.isFinite(comparePrice) || comparePrice < price))) {
      return NextResponse.json({ error: "Enter valid prices. The regular price must be greater than or equal to the selling price." }, { status: 400 });
    }
    if (body.status && !["DRAFT", "ACTIVE", "ARCHIVED"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid product status." }, { status: 400 });
    }

    const [slugOwner, skuOwner] = await Promise.all([
      prisma.product.findUnique({ where: { slug: body.slug.trim() }, select: { id: true } }),
      body.sku?.trim() ? prisma.product.findUnique({ where: { sku: body.sku.trim() }, select: { id: true } }) : Promise.resolve(null),
    ]);
    if (slugOwner && slugOwner.id !== id) return NextResponse.json({ error: "This permalink is already used by another product." }, { status: 409 });
    if (skuOwner && skuOwner.id !== id) return NextResponse.json({ error: "This SKU is already used by another product." }, { status: 409 });

    data.name = body.name.trim();
    data.slug = body.slug.trim();
    data.sku = typeof body.sku === "string" && body.sku.trim() ? body.sku.trim() : null;
    data.description = typeof body.description === "string" ? body.description : null;
    data.price = price;
    data.comparePrice = comparePrice;
    if (body.status) {
      data.status = body.status;
      data.isActive = body.status === "ACTIVE";
      data.publishedAt = body.status === "ACTIVE" ? new Date() : null;
    }

    const product = await prisma.product.update({
      where: { id }, data,
      select: { id: true, name: true, slug: true, sku: true, description: true, price: true, comparePrice: true, status: true, isActive: true },
    });
    await prisma.activityLog.create({
      data: { userId: auth.user.id, action: "PRODUCT_UPDATED", entity: "PRODUCT", entityId: id, description: "Updated product " + product.name },
    });
    return NextResponse.json({ message: "Product updated successfully.", product });
  } catch (error) {
    console.error("Products PATCH error:", error);
    return NextResponse.json({ error: "Unable to update product." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await context.params;
    const existingProduct = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!existingProduct) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: "Product deleted successfully." });
  } catch (error) {
    console.error("Products DELETE error:", error);
    return NextResponse.json({ error: "Unable to delete product. It may be linked to existing orders or other records." }, { status: 500 });
  }
}
