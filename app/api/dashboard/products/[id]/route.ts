
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardAdmin } from "@/lib/dashboard-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await context.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        categories: { include: { category: { select: { id: true, name: true } } } },
        attributes: { include: { attributeValue: { include: { attribute: true } } } },
        variants: { orderBy: { createdAt: "asc" } },
        inventories: { where: { variantId: null } },
      },
    });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json({ product });
  } catch (error) {
    console.error("Product GET by id error:", error);
    return NextResponse.json({ error: "Unable to load product details." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await context.params;
    const body = await request.json() as {
      name?: string;
      slug?: string;
      sku?: string;
      regularPrice?: number;
      salePrice?: number | null;
      stock?: number;
      status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
      isActive?: boolean;
      categoryIds?: string[];
      imageOrder?: string[];
    };

    const name = body.name?.trim() ?? "";
    const slug = body.slug?.trim().toLowerCase() ?? "";
    const sku = body.sku?.trim() ?? "";
    const regularPrice = Number(body.regularPrice);
    const salePrice = body.salePrice === null || body.salePrice === undefined || body.salePrice === 0
      ? null
      : Number(body.salePrice);
    const status = body.status;
    const isActive = body.isActive !== false;
    const categoryIds = Array.isArray(body.categoryIds) ? [...new Set(body.categoryIds)] : [];
    const stock = body.stock === undefined ? undefined : Number(body.stock);

    if (!name || !slug || !Number.isFinite(regularPrice) || regularPrice < 0) {
      return NextResponse.json({ error: "Enter a product name, permalink and valid regular price." }, { status: 400 });
    }
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice > regularPrice)) {
      return NextResponse.json({ error: "Sale price must be between zero and the regular price." }, { status: 400 });
    }
    if (!status || !["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) {
      return NextResponse.json({ error: "Choose a valid product status." }, { status: 400 });
    }
    if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
      return NextResponse.json({ error: "Stock must be a whole number greater than or equal to zero." }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, publishedAt: true, variants: { select: { id: true } }, images: { select: { id: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const [slugOwner, skuOwner, categories] = await Promise.all([
      prisma.product.findUnique({ where: { slug }, select: { id: true } }),
      sku ? prisma.product.findUnique({ where: { sku }, select: { id: true } }) : Promise.resolve(null),
      categoryIds.length ? prisma.category.findMany({ where: { id: { in: categoryIds }, isActive: true }, select: { id: true } }) : Promise.resolve([]),
    ]);
    if (slugOwner && slugOwner.id !== id) return NextResponse.json({ error: "This permalink is already used by another product." }, { status: 409 });
    if (skuOwner && skuOwner.id !== id) return NextResponse.json({ error: "This SKU is already used by another product." }, { status: 409 });
    if (categories.length !== categoryIds.length) return NextResponse.json({ error: "One or more selected categories are unavailable." }, { status: 400 });

    if (body.imageOrder) {
      const uniqueImageIds = [...new Set(body.imageOrder)];
      const existingIds = existing.images.map((image) => image.id).sort();
      if (uniqueImageIds.length !== existing.images.length || uniqueImageIds.sort().join("|") !== existingIds.join("|")) {
        return NextResponse.json({ error: "The product image order is invalid. Refresh and try again." }, { status: 400 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          name,
          slug,
          sku: sku || null,
          price: salePrice ?? regularPrice,
          comparePrice: salePrice !== null && salePrice < regularPrice ? regularPrice : null,
          status,
          isActive,
          publishedAt: status === "ACTIVE" ? existing.publishedAt ?? new Date() : null,
          categories: {
            deleteMany: {},
            create: categoryIds.map((categoryId) => ({ categoryId })),
          },
        },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          categories: { include: { category: { select: { id: true, name: true } } } },
        },
      });

      if (body.imageOrder) {
        for (const [index, imageId] of body.imageOrder.entries()) {
          await tx.productImage.updateMany({
            where: { id: imageId, productId: id },
            data: { sortOrder: index, isPrimary: index === 0 },
          });
        }
      }

      if (stock !== undefined && existing.variants.length === 0) {
        const inventory = await tx.inventory.findFirst({ where: { productId: id, variantId: null }, select: { id: true } });
        if (inventory) {
          await tx.inventory.update({ where: { id: inventory.id }, data: { quantity: stock } });
        } else {
          await tx.inventory.create({ data: { productId: id, quantity: stock } });
        }
      }

      return product;
    });

    return NextResponse.json({ message: "Product updated successfully.", product: updated });
  } catch (error) {
    console.error("Product update API error:", error);
    return NextResponse.json({ error: "Unable to update product. Please check the details and try again." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await getDashboardAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "A valid active status is required." },
        { status: 400 }
      );
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        isActive: body.isActive,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        status: true,
      },
    });

    return NextResponse.json({
      message: body.isActive
        ? "Product turned on successfully."
        : "Product turned off successfully.",
      product,
    });
  } catch (error) {
    console.error("Products PATCH error:", error);

    return NextResponse.json(
      { error: "Unable to update product." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await getDashboardAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await context.params;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error("Products DELETE error:", error);

    return NextResponse.json(
      { error: "Unable to delete product. It may be linked to existing orders or other records." },
      { status: 500 }
    );
  }
}
