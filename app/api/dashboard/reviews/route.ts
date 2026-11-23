import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
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
      return NextResponse.json({ error: "Only administrators can manage reviews." }, { status: 403 });
    }
    const body = await request.json() as { reviewId?: string; isApproved?: boolean; adminReply?: string | null };
    if (!body.reviewId || (typeof body.isApproved !== "boolean" && typeof body.adminReply !== "string" && body.adminReply !== null)) {
      return NextResponse.json({ error: "Review details are required." }, { status: 400 });
    }
    if (typeof body.adminReply === "string" && body.adminReply.length > 3000) {
      return NextResponse.json({ error: "The reply must be 3,000 characters or fewer." }, { status: 400 });
    }
    const review = await prisma.review.update({
      where: { id: body.reviewId },
      data: {
        ...(typeof body.isApproved === "boolean" ? { isApproved: body.isApproved } : {}),
        ...(body.adminReply !== undefined ? { adminReply: body.adminReply?.trim() || null } : {}),
      },
    });
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: typeof body.isApproved === "boolean" ? "REVIEW_MODERATED" : "REVIEW_REPLIED",
        entity: "REVIEW",
        entityId: review.id,
        description: typeof body.isApproved === "boolean" ? "A product review's visibility was updated." : "An administrator replied to a product review.",
      },
    });
    return NextResponse.json({ review });
  } catch (error) {
    console.error("Review management error:", error);
    return NextResponse.json({ error: "Unable to update this review." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can delete reviews." }, { status: 403 });
    }
    const body = await request.json() as { reviewId?: string };
    if (!body.reviewId) return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
    await prisma.review.delete({ where: { id: body.reviewId } });
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "REVIEW_DELETED",
        entity: "REVIEW",
        entityId: body.reviewId,
        description: "A product review was deleted by an administrator.",
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Review deletion error:", error);
    return NextResponse.json({ error: "Unable to delete this review." }, { status: 500 });
  }
}
