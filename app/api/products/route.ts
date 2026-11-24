import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Keep the public product payload lean while including the price required
    // by both storefront cards and the wishlist.
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        images: {
          select: {
            id: true,
            url: true,
            altText: true,
            isPrimary: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
        attributes: {
          select: {
            attributeValue: {
              select: {
                value: true,
                termType: true,
                attribute: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      { products },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Public products API error:", error);

    return NextResponse.json(
      { error: "Unable to load products." },
      { status: 500 }
    );
  }
}
