
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

const ALLOWED_SIZE_SYMBOLS = ["S", "M", "L", "XL", "XXL"];

type Context = {
  params: Promise<{ id: string }>;
};

// ─── GET ATTRIBUTE TERMS ────────────────────────

export async function GET(
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

    const { id } = await params;

    const attribute = await prisma.attribute.findUnique({
      where: { id },
      include: {
        values: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!attribute) {
      return NextResponse.json(
        { error: "Attribute not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ attribute });
  } catch (error) {
    console.error("Attribute terms GET error:", error);

    return NextResponse.json(
      { error: "Unable to load terms." },
      { status: 500 }
    );
  }
}

// ─── CREATE ATTRIBUTE TERM ──────────────────────

export async function POST(
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

    const { id } = await params;

    const attribute = await prisma.attribute.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!attribute) {
      return NextResponse.json(
        { error: "Attribute not found." },
        { status: 404 }
      );
    }

    const formData = await request.formData();

    const rawValue = formData.get("value");
    const rawTermType = formData.get("termType");
    const rawSizeSymbol = formData.get("sizeSymbol");
    const file = formData.get("image");

    const value =
      typeof rawValue === "string" ? rawValue.trim() : "";

    // Attribute terms are colour-only; size options are not supported here.
    const termType = "COLOR";

    const sizeSymbol =
      typeof rawSizeSymbol === "string"
        ? rawSizeSymbol.trim().toUpperCase()
        : "";

    if (!value || value.length > 80) {
      return NextResponse.json(
        { error: "Enter a term (maximum 80 characters)." },
        { status: 400 }
      );
    }

    // Validate size symbol
    if (
      termType === "SIZE" &&
      !ALLOWED_SIZE_SYMBOLS.includes(sizeSymbol)
    ) {
      return NextResponse.json(
        {
          error: "Select a valid size symbol: S, M, L, XL or XXL.",
        },
        { status: 400 }
      );
    }

    // Check duplicate terms
    const duplicate = await prisma.attributeValue.findFirst({
      where: {
        attributeId: id,
        value: {
          equals: value,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "This term already exists." },
        { status: 409 }
      );
    }

    let image: string | null = null;
    let storageKey: string | null = null;

    // ─── COLOR TERM IMAGE UPLOAD ─────────────────

    if (termType === "COLOR") {
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json(
          { error: "Please select an image for this color." },
          { status: 400 }
        );
      }

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

      storageKey = `attributes/${id}/${randomUUID()}.${extension}`;
      uploadedKey = storageKey;

      const buffer = Buffer.from(await file.arrayBuffer());

      await s3.send(
        new PutObjectCommand({
          Bucket: storageBucket,
          Key: storageKey,
          Body: buffer,
          ContentType: file.type,
          CacheControl: "public, max-age=31536000",
        })
      );

      image = getPublicObjectUrl(storageKey);
    }

    // ─── CREATE TERM IN DATABASE ─────────────────

    const term = await prisma.attributeValue.create({
      data: {
        value,
        attributeId: id,
        termType,
        sizeSymbol: termType === "SIZE" ? sizeSymbol : null,
        image,
        storageKey,
      },
    });

    return NextResponse.json(
      {
        message: "Term created successfully.",
        term,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Attribute terms POST error:", error);

    // Remove uploaded image if database creation fails
    if (uploadedKey) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: storageBucket,
            Key: uploadedKey,
          })
        );
      } catch (cleanupError) {
        console.error("Term upload cleanup error:", cleanupError);
      }
    }

    return NextResponse.json(
      { error: "Unable to create term." },
      { status: 500 }
    );
  }
}
