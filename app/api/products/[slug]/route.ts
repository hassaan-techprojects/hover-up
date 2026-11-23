
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Product slug is required." },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const canPreviewUnpublished = ["ADMIN", "ANALYST"].includes(session?.user?.role || "");
    const product = await prisma.product.findFirst({
      where: { slug, ...(canPreviewUnpublished ? {} : { status: "ACTIVE", isActive: true }) },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        shortDescription: true,
        sku: true,
        price: true,
        comparePrice: true,
        costPrice: true,
        status: true,
        isFeatured: true,
        isActive: true,
        metaTitle: true,
        metaDescription: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
        images: {
          orderBy: [
            { isPrimary: "desc" },
            { sortOrder: "asc" },
          ],
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        variants: {
          where: { isActive: true },
          include: {
            images: {
              orderBy: [
                { isPrimary: "desc" },
                { sortOrder: "asc" },
              ],
            },
            inventory: true,
          },
          orderBy: { createdAt: "asc" },
        },
        attributes: {
          include: {
            attributeValue: {
              include: {
                attribute: true,
              },
            },
          },
        },
        inventories: {
          where: { variantId: null },
        },
        reviews: {
          where: { isApproved: true },
          select: {
            id: true,
            rating: true,
            title: true,
            comment: true,
            createdAt: true,
            customer: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    const totalStock = product.variants.length > 0
      ? product.variants.reduce(
          (total, variant) =>
            total +
            Math.max(
              0,
              variant.inventory
                ? variant.inventory.quantity -
                    variant.inventory.reserved
                : variant.stock
            ),
          0
        )
      : product.inventories.reduce(
          (total, inventory) =>
            total +
            Math.max(
              0,
              inventory.quantity - inventory.reserved
            ),
          0
        );

    let packPricing: Record<string, number> | null = null;
    try {
      const pricingRows = await prisma.$queryRaw<Array<{ packPricing: unknown }>>`
        SELECT "packPricing"
        FROM "Product"
        WHERE "id" = ${product.id}
        LIMIT 1
      `;
      const savedPricing = pricingRows[0]?.packPricing;
      if (savedPricing && typeof savedPricing === "object" && !Array.isArray(savedPricing)) {
        packPricing = Object.fromEntries(
          Object.entries(savedPricing as Record<string, unknown>)
            .map(([size, price]): [string, number] => [size, Number(price)])
            .filter(([size, price]) => Number.isInteger(Number(size)) && Number(size) > 0 && Number.isFinite(Number(price)) && Number(price) >= 0)
        );
      }
    } catch (pricingError) {
      // Older Preview databases may not have the per-product pack pricing migration yet.
      console.warn("Product pack pricing is not available in this database yet:", pricingError);
    }

    const reviewCount = product.reviews.length;

    const averageRating =
      reviewCount > 0
        ? product.reviews.reduce(
            (total, review) => total + review.rating,
            0
          ) / reviewCount
        : 0;

    return NextResponse.json({
      product: {
        ...product,
        packPricing,
        reviews: product.reviews.map((review) => ({ ...review, images: [] })),
        totalStock,
        isInStock: totalStock > 0,
        averageRating: Number(averageRating.toFixed(1)),
        reviewCount,
      },
    });
  } catch (error) {
    console.error("Product detail API error:", error);

    return NextResponse.json(
      { error: "Unable to load product details." },
      { status: 500 }
    );
  }
}
