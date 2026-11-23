import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ReviewImageInput = { url?: string; key?: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Sign in to submit a product review." }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json() as { rating?: number; title?: string; comment?: string; images?: ReviewImageInput[] };
    const rating = Number(body.rating);
    const title = body.title?.trim() || "";
    const comment = body.comment?.trim() || "";
    const images = Array.isArray(body.images) ? body.images : [];

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Choose a rating from 1 to 5 stars." }, { status: 400 });
    }
    if (!comment && !title) {
      return NextResponse.json({ error: "Write a short review before submitting." }, { status: 400 });
    }
    if (comment.length > 3000 || title.length > 120 || images.length > 4) {
      return NextResponse.json({ error: "Your review is too long or has too many photos." }, { status: 400 });
    }

    const endpoint = process.env.AWS_ENDPOINT_URL_S3?.replace(/\/+$/, "");
    const bucket = process.env.NEON_STORAGE_BUCKET;
    if (!endpoint || !bucket) {
      return NextResponse.json({ error: "Review photo storage is not configured." }, { status: 503 });
    }

    for (const image of images) {
      if (!image.url || !image.key || !image.key.startsWith("reviews/") || !image.url.startsWith(`${endpoint}/${bucket}/reviews/`)) {
        return NextResponse.json({ error: "One of the review photos is invalid." }, { status: 400 });
      }
    }

    const [customer, product] = await Promise.all([
      prisma.customer.findUnique({ where: { userId: session.user.id }, select: { id: true } }),
      prisma.product.findFirst({ where: { slug, status: "ACTIVE", isActive: true }, select: { id: true } }),
    ]);
    if (!customer) return NextResponse.json({ error: "Customer account not found." }, { status: 404 });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const review = await prisma.$transaction(async (tx) => {
      const saved = await tx.review.upsert({
        where: { customerId_productId: { customerId: customer.id, productId: product.id } },
        update: { rating, title: title || null, comment: comment || null, isApproved: false },
        create: { customerId: customer.id, productId: product.id, rating, title: title || null, comment: comment || null },
      });
      await tx.reviewImage.deleteMany({ where: { reviewId: saved.id } });
      if (images.length) {
        await tx.reviewImage.createMany({
          data: images.map((image, index) => ({
            reviewId: saved.id,
            storageKey: image.key!,
            url: image.url!,
            sortOrder: index,
          })),
        });
      }
      return saved;
    });

    return NextResponse.json({ success: true, reviewId: review.id, message: "Your review has been submitted and is waiting for approval." }, { status: 201 });
  } catch (error) {
    console.error("Product review submission error:", error);
    return NextResponse.json({ error: "Unable to submit your review." }, { status: 500 });
  }
}
