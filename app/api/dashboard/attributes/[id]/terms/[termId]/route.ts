
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getDashboardAdmin } from "@/lib/dashboard-admin";
import { s3, storageBucket, getPublicObjectUrl } from "@/lib/storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type Context = {
  params: Promise<{ termId: string }>;
};

export async function PATCH(
  request: NextRequest,
  { params }: Context
) {
  let uploadedKey: string | null = null;

  try {
    const auth = await getDashboardAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { termId } = await params;

    const existing = await prisma.attributeValue.findUnique({
      where: { id: termId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Term not found." },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const rawValue = formData.get("value");
    const file = formData.get("image");

    const value =
      typeof rawValue === "string" ? rawValue.trim() : "";

    if (!value || value.length > 80) {
      return NextResponse.json(
        { error: "Enter a term (maximum 80 characters)." },
        { status: 400 }
      );
    }

    const duplicate = await prisma.attributeValue.findFirst({
      where: {
        id: { not: termId },
        attributeId: existing.attributeId,
        value: { equals: value, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "This term already exists." },
        { status: 409 }
      );
    }

    let image = existing.image;
    let storageKey = existing.storageKey;

    if (file instanceof File && file.size > 0) {
      const extension = ALLOWED_TYPES[file.type];

      if (!extension) {
        return NextResponse.json(
          { error: "Only JPG, PNG and WEBP images are allowed." },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Term image must be less than 5 MB." },
          { status: 400 }
        );
      }

      const newKey = `attributes/${existing.attributeId}/${randomUUID()}.${extension}`;
      uploadedKey = newKey;

      await s3.send(
        new PutObjectCommand({
          Bucket: storageBucket,
          Key: newKey,
          Body: Buffer.from(await file.arrayBuffer()),
          ContentType: file.type,
          CacheControl: "public, max-age=31536000",
        })
      );

      image = getPublicObjectUrl(newKey);
      storageKey = newKey;
    }

    const term = await prisma.attributeValue.update({
      where: { id: termId },
      data: { value, image, storageKey },
    });

    if (uploadedKey && existing.storageKey) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: storageBucket,
            Key: existing.storageKey,
          })
        );
      } catch (cleanupError) {
        console.error("Old term image cleanup error:", cleanupError);
      }
    }

    return NextResponse.json({
      message: "Term updated successfully.",
      term,
    });
  } catch (error) {
    console.error("Attribute term PATCH error:", error);

    if (uploadedKey) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: storageBucket,
            Key: uploadedKey,
          })
        );
      } catch (cleanupError) {
        console.error("Term image cleanup error:", cleanupError);
      }
    }

    return NextResponse.json(
      { error: "Unable to update term." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: Context
) {
  try {
    const auth = await getDashboardAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { termId } = await params;

    const term = await prisma.attributeValue.findUnique({
      where: { id: termId },
    });

    if (!term) {
      return NextResponse.json(
        { error: "Term not found." },
        { status: 404 }
      );
    }

    if (term.storageKey) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: storageBucket,
          Key: term.storageKey,
        })
      );
    }

    await prisma.attributeValue.delete({
      where: { id: termId },
    });

    return NextResponse.json({
      message: "Term deleted successfully.",
    });
  } catch (error) {
    console.error("Attribute term DELETE error:", error);

    return NextResponse.json(
      { error: "Unable to delete term." },
      { status: 500 }
    );
  }
}
