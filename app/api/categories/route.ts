
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json(
      {
        categories,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Public categories error:", error);

    return NextResponse.json(
      {
        error: "Unable to load categories",
      },
      {
        status: 500,
      }
    );
  }
}
