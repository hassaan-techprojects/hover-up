import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPublicObjectUrl, s3, storageBucket } from "@/lib/storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in to upload review photos." }, { status: 401 });
    }

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          ...(session.user.email ? [{ email: session.user.email.trim().toLowerCase(), userId: null }] : []),
        ],
      },
      select: { id: true, userId: true },
    });
    if (!customer) {
      return NextResponse.json({ error: "This login is not linked to a customer profile. Please use your customer account." }, { status: 403 });
    }
    if (!customer.userId) {
      await prisma.customer.update({ where: { id: customer.id }, data: { userId: session.user.id } });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    }

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      return NextResponse.json({ error: "Only JPG, PNG, and WEBP images are allowed." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Each review photo must be 5 MB or smaller." }, { status: 400 });
    }

    const key = `reviews/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await s3.send(new PutObjectCommand({
      Bucket: storageBucket,
      Key: key,
      Body: bytes,
      ContentType: file.type,
      ContentLength: bytes.length,
    }));

    return NextResponse.json({ url: getPublicObjectUrl(key), key });
  } catch (error) {
    console.error("Review image upload error:", error);
    return NextResponse.json({ error: "Unable to upload this review photo." }, { status: 500 });
  }
}
