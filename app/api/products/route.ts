import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // This endpoint powers both the homepage and the full shop catalogue.
    // Keep the complete storefront fields here so the shop page receives
    // prices, categories, variants, inventory and attribute values.
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        description: true,
        price: true,
        comparePrice: true,
        images: {
          select: {
            id: true,
            url: true,
            altText: true,
            isPrimary: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        categories: {
          select: {
            category: {
              select: { name: true },
            },
          },
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            attributes: true,
            images: {
              select: {
                id: true,
                url: true,
                altText: true,
                isPrimary: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: "asc" },
            },
            inventory: {
              select: { quantity: true },
            },
          },
        },
        attributes: {
          select: {
            attributeValue: {
              select: {
                id: true,
                value: true,
                termType: true,
                sizeSymbol: true,
                image: true,
                attribute: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { products },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
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
