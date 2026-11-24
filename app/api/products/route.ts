import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // The homepage only needs product identity, gallery images and colour
    // attributes. Avoid loading categories, variants and inventory records
    // for every product on the homepage.
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
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
