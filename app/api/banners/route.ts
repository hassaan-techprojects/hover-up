
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const getActiveBanners = unstable_cache(
  async () => {
    return prisma.banner.findMany({
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
  },
  ["homepage-active-banners"],
  {
    revalidate: 15,
    tags: ["homepage-banners"],
  }
);

export async function GET() {
  try {
    const banners = await getActiveBanners();

    return NextResponse.json(
      { banners },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=15, stale-while-revalidate=60",
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
