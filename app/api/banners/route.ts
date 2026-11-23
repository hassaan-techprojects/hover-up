import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const banners = await prisma.banner.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        image: true,
        sortOrder: true,
      },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(
      { banners },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Public banners error:", error);

    return NextResponse.json(
      { error: "Unable to load banners." },
      { status: 500 }
    );
  }
}