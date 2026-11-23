
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  s3,
  storageBucket,
  getPublicObjectUrl,
} from "@/lib/storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function getAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return {
      error: "Unauthorized",
      status: 401,
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return {
      error: "Unauthorized",
      status: 401,
    };
  }

  if (!["ADMIN", "ANALYST"].includes(user.role)) {
    return {
      error: "Forbidden. Catalogue staff access required.",
      status: 403,
    };
  }

  return {
    user,
  };
}

// GET: Load all banners
export async function GET() {
  try {
    const auth = await getAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const banners = await prisma.banner.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(
      { banners },
      { status: 200 }
    );
  } catch (error) {
    console.error("Dashboard banners GET error:", error);

    return NextResponse.json(
      { error: "Unable to load banners." },
      { status: 500 }
    );
  }
}

// POST: Upload a banner image
export async function POST(request: NextRequest) {
  let uploadedKey: string | null = null;

  try {
    const auth = await getAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please select a banner image." },
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

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Banner image must be greater than 0 and less than 5 MB." },
        { status: 400 }
      );
    }

    const storageKey = `banners/${randomUUID()}.${extension}`;
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

    const image = getPublicObjectUrl(storageKey);

    const banner = await prisma.banner.create({
      data: {
        image,
        storageKey,
        status: "ACTIVE",
        createdById: auth.user.id,
      },
    });

    return NextResponse.json(
      {
        message: "Banner uploaded successfully.",
        banner,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Dashboard banners POST error:", error);

    if (uploadedKey) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: storageBucket,
            Key: uploadedKey,
          })
        );
      } catch (cleanupError) {
        console.error("Banner upload cleanup error:", cleanupError);
      }
    }

    return NextResponse.json(
      { error: "Unable to upload banner." },
      { status: 500 }
    );
  }
}

// PATCH: Activate or deactivate a banner
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();

    const { id, status } = body;

    if (!id || !["ACTIVE", "DRAFT"].includes(status)) {
      return NextResponse.json(
        { error: "A valid banner ID and status are required." },
        { status: 400 }
      );
    }

    const existingBanner = await prisma.banner.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingBanner) {
      return NextResponse.json(
        { error: "Banner not found." },
        { status: 404 }
      );
    }

    const banner = await prisma.banner.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(
      {
        message: "Banner status updated successfully.",
        banner,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Dashboard banners PATCH error:", error);

    return NextResponse.json(
      { error: "Unable to update banner status." },
      { status: 500 }
    );
  }
}

// DELETE: Delete a banner and its stored image
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await request.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "A valid banner ID is required." },
        { status: 400 }
      );
    }

    const banner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      return NextResponse.json(
        { error: "Banner not found." },
        { status: 404 }
      );
    }

    if (banner.storageKey) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: storageBucket,
          Key: banner.storageKey,
        })
      );
    }

    await prisma.banner.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Banner deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Dashboard banners DELETE error:", error);

    return NextResponse.json(
      { error: "Unable to delete banner." },
      { status: 500 }
    );
  }
}
