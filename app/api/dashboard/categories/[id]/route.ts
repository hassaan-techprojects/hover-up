import { NextResponse } from "next/server";
import { getDashboardCatalogStaff } from "@/lib/dashboard-catalog-staff";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  try {
    const auth = await getDashboardCatalogStaff();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await params;
    const body = await request.json() as { isActive?: boolean };
    if (typeof body.isActive !== "boolean") return NextResponse.json({ error: "Choose whether this category should be visible." }, { status: 400 });
    const category = await prisma.category.update({ where: { id }, data: { isActive: body.isActive } });
    await prisma.activityLog.create({
      data: { userId: auth.user.id, action: body.isActive ? "CATEGORY_PUBLISHED" : "CATEGORY_HIDDEN", entity: "CATEGORY", entityId: id, description: body.isActive ? "A category was made visible on the storefront." : "A category was hidden from the storefront." },
    });
    return NextResponse.json({ category });
  } catch (error) {
    console.error("Category visibility update error:", error);
    return NextResponse.json({ error: "Unable to update category visibility." }, { status: 500 });
  }
}
