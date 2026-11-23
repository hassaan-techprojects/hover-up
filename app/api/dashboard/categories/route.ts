
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3, storageBucket, getPublicObjectUrl } from "@/lib/storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, isActive: true },
    });

    if (!user || user.role !== "ADMIN" || !user.isActive) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Fetch categories error:", error);

    return NextResponse.json(
      { error: "Unable to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let uploadedKey: string | null = null;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, isActive: true },
    });

    if (!user || user.role !== "ADMIN" || !user.isActive) {
      return NextResponse.json(
        { error: "Only active admins can create categories" },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const image = formData.get("image");

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Category name must be 100 characters or fewer" },
        { status: 400 }
      );
    }

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json(
        { error: "Please select a category image" },
        { status: 400 }
      );
    }

    const extension = ALLOWED_TYPES[image.type];

    if (!extension) {
      return NextResponse.json(
        { error: "Only JPG, PNG and WEBP images are allowed" },
        { status: 400 }
      );
    }

    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be smaller than 5 MB" },
        { status: 400 }
      );
    }

    const baseSlug = createSlug(name);

    if (!baseSlug) {
      return NextResponse.json(
        { error: "Please enter a valid category name" },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          { slug: baseSlug },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }

    const slug = baseSlug;
    const storageKey = `categories/${randomUUID()}.${extension}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: storageBucket,
        Key: storageKey,
        Body: Buffer.from(await image.arrayBuffer()),
        ContentType: image.type,
        ContentLength: image.size,
      })
    );

    uploadedKey = storageKey;

    const imageUrl = getPublicObjectUrl(storageKey);

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        image: imageUrl,
        storageKey,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        message: "Category created successfully",
        category,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create category error:", error);

    if (uploadedKey) {
      try {
        const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");

        await s3.send(
          new DeleteObjectCommand({
            Bucket: storageBucket,
            Key: uploadedKey,
          })
        );
      } catch (cleanupError) {
        console.error("Image cleanup error:", cleanupError);
      }
    }

    return NextResponse.json(
      { error: "Unable to create category. Please try again." },
      { status: 500 }
    );
  }
}
