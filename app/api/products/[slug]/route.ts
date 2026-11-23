
import { NextResponse } from "next/server";
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

    const product = await prisma.product.findFirst({
      where: {
        slug,
        status: "ACTIVE",
        isActive: true,
      },
      include: {
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
          where: {
            isActive: true,
          },
          include: {
            images: {
              orderBy: [
                { isPrimary: "desc" },
                { sortOrder: "asc" },
              ],
            },
            inventory: true,
          },
          orderBy: {
            createdAt: "asc",
          },
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
          where: {
            variantId: null,
          },
        },

        reviews: {
          where: {
            isApproved: true,
          },
          select: {
            id: true,
            rating: true,
            title: true,
            comment: true,
            createdAt: true,
            images: {
              orderBy: { sortOrder: "asc" },
              select: { id: true, url: true },
            },
            customer: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
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
