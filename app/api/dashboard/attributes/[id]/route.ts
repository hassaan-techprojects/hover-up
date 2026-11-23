
import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getDashboardAdmin } from "@/lib/dashboard-admin";
import { s3, storageBucket } from "@/lib/storage";

type Context = {
  params: Promise<{ id: string }>;
};

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function PATCH(
  request: NextRequest,
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
    const body = await request.json();
    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    if (!name || name.length > 80) {
      return NextResponse.json(
        { error: "Enter an attribute name (maximum 80 characters)." },
        { status: 400 }
      );
    }

    const existing = await prisma.attribute.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Attribute not found." },
        { status: 404 }
      );
    }

    const duplicate = await prisma.attribute.findFirst({
      where: {
        id: { not: id },
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "An attribute with this name already exists." },
        { status: 409 }
      );
    }

    const baseSlug = createSlug(name);

    if (!baseSlug) {
      return NextResponse.json(
        { error: "Please enter a valid attribute name." },
        { status: 400 }
      );
    }

    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const conflict = await prisma.attribute.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!conflict || conflict.id === id) break;
      slug = `${baseSlug}-${suffix++}`;
    }

    const attribute = await prisma.attribute.update({
      where: { id },
      data: { name, slug },
      include: {
        _count: {
          select: { values: true },
        },
      },
    });

    return NextResponse.json({
      message: "Attribute updated successfully.",
      attribute,
    });
  } catch (error) {
    console.error("Attribute PATCH error:", error);

    return NextResponse.json(
      { error: "Unable to update attribute." },
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

    const { id } = await params;

    const attribute = await prisma.attribute.findUnique({
      where: { id },
      include: {
        values: {
          select: { storageKey: true },
        },
      },
    });

    if (!attribute) {
      return NextResponse.json(
        { error: "Attribute not found." },
        { status: 404 }
      );
    }

    for (const value of attribute.values) {
      if (value.storageKey) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: storageBucket,
            Key: value.storageKey,
          })
        );
      }
    }

    await prisma.attribute.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Attribute deleted successfully.",
    });
  } catch (error) {
    console.error("Attribute DELETE error:", error);

    return NextResponse.json(
      { error: "Unable to delete attribute." },
      { status: 500 }
    );
  }
}
