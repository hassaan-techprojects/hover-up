import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getPublicObjectUrl, s3, storageBucket } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const side = formData.get("side");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please select an image file." }, { status: 400 });
    }

    if (side !== "front" && side !== "back") {
      return NextResponse.json({ error: "Invalid design image type." }, { status: 400 });
    }

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and WEBP images are allowed." },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Each image must be smaller than or equal to 8 MB." },
        { status: 400 }
      );
    }

    const key = `customizations/${new Date().toISOString().slice(0, 10)}/${side}-${randomUUID()}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: storageBucket,
        Key: key,
        Body: bytes,
        ContentType: file.type,
        ContentLength: bytes.length,
      })
    );

    return NextResponse.json({
      url: getPublicObjectUrl(key),
      key,
      side,
    });
  } catch (error) {
    console.error("Customization image upload error:", error);
    return NextResponse.json(
      { error: "Unable to upload your design image. Please try again." },
      { status: 500 }
    );
  }
}
