
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardAdmin } from "@/lib/dashboard-admin";

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const attributeInclude = {
  values: {
    select: {
      id: true,
      value: true,
      image: true,
    },
    orderBy: {
      value: "asc" as const,
    },
  },
  _count: {
    select: {
      values: true,
    },
  },
};

export async function GET() {
  try {
    const auth = await getDashboardAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const attributes = await prisma.attribute.findMany({
      include: attributeInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ attributes });
  } catch (error) {
    console.error("Attributes GET error:", error);

    return NextResponse.json(
      { error: "Unable to load attributes." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getDashboardAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    if (!name || name.length > 80) {
      return NextResponse.json(
        { error: "Enter an attribute name (maximum 80 characters)." },
        { status: 400 }
      );
    }

    const duplicate = await prisma.attribute.findFirst({
      where: {
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

    while (
      await prisma.attribute.findUnique({
        where: { slug },
        select: { id: true },
      })
    ) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const attribute = await prisma.attribute.create({
      data: { name, slug },
      include: attributeInclude,
    });

    return NextResponse.json(
      {
        message: "Attribute created successfully.",
        attribute,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Attributes POST error:", error);

    return NextResponse.json(
      { error: "Unable to create attribute." },
      { status: 500 }
    );
  }
}
