import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["ADMIN", "ANALYST"].includes(session.user.role)) {
      return NextResponse.json({ error: "You are not allowed to view reviews." }, { status: 403 });
    }
    const reviews = await prisma.review.findMany({
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        product: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ reviews, canManage: session.user.role === "ADMIN" });
  } catch (error) {
    console.error("Dashboard reviews API error:", error);
    return NextResponse.json({ error: "Unable to load reviews." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can approve reviews." }, { status: 403 });
    }
    const body = await request.json() as { reviewId?: string; isApproved?: boolean };
    if (!body.reviewId || typeof body.isApproved !== "boolean") {
      return NextResponse.json({ error: "Review and approval status are required." }, { status: 400 });
    }
    const review = await prisma.review.update({
      where: { id: body.reviewId },
      data: { isApproved: body.isApproved },
    });
    return NextResponse.json({ review });
  } catch (error) {
    console.error("Review approval error:", error);
    return NextResponse.json({ error: "Unable to update review approval." }, { status: 500 });
  }
}
