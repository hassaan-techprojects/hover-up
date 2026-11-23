
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardAdmin } from "@/lib/dashboard-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await getDashboardAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "A valid active status is required." },
        { status: 400 }
      );
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        isActive: body.isActive,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        status: true,
      },
    });

    return NextResponse.json({
      message: body.isActive
        ? "Product turned on successfully."
        : "Product turned off successfully.",
      product,
    });
  } catch (error) {
    console.error("Products PATCH error:", error);

    return NextResponse.json(
      { error: "Unable to update product." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await getDashboardAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await context.params;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error("Products DELETE error:", error);

    return NextResponse.json(
      { error: "Unable to delete product. It may be linked to existing orders or other records." },
      { status: 500 }
    );
  }
}
