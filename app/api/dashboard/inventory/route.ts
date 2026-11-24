import { NextResponse } from "next/server";
import { getDashboardAdmin } from "@/lib/dashboard-admin";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const body = await request.json() as { inventoryId?: string; quantity?: number; note?: string };
    if (!body.inventoryId || !Number.isInteger(Number(body.quantity)) || Number(body.quantity) < 0) {
      return NextResponse.json({ error: "Enter a valid stock quantity." }, { status: 400 });
    }
    const current = await prisma.inventory.findUnique({ where: { id: body.inventoryId }, select: { id: true, quantity: true, reserved: true } });
    if (!current) return NextResponse.json({ error: "Inventory record not found." }, { status: 404 });
    if (Number(body.quantity) < current.reserved) return NextResponse.json({ error: "Stock cannot be lower than the quantity already reserved for orders." }, { status: 409 });
    const delta = Number(body.quantity) - current.quantity;
    const updated = await prisma.$transaction(async tx => {
      const inventory = await tx.inventory.update({ where: { id: current.id }, data: { quantity: Number(body.quantity) } });
      if (delta !== 0) {
        await tx.inventoryMovement.create({ data: { inventoryId: current.id, type: "ADJUSTMENT", quantity: delta, note: (body.note || "Manual stock adjustment").slice(0, 500) } });
      }
      await tx.activityLog.create({
        data: { userId: auth.user.id, action: "INVENTORY_ADJUSTED", entity: "INVENTORY", entityId: current.id, description: "Adjusted inventory quantity from " + current.quantity + " to " + inventory.quantity, metadata: { previousQuantity: current.quantity, newQuantity: inventory.quantity, delta } },
      });
      return inventory;
    });
    return NextResponse.json({ inventory: updated });
  } catch (error) {
    console.error("Dashboard inventory adjustment error:", error);
    return NextResponse.json({ error: "Unable to update inventory." }, { status: 500 });
  }
}


export async function DELETE(request: Request) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const body = await request.json() as { inventoryId?: string };
    if (!body.inventoryId) return NextResponse.json({ error: "Inventory record ID is required." }, { status: 400 });

    const current = await prisma.inventory.findUnique({
      where: { id: body.inventoryId },
      select: { id: true, quantity: true, reserved: true, product: { select: { name: true } }, variant: { select: { name: true } } },
    });
    if (!current) return NextResponse.json({ error: "Inventory record not found." }, { status: 404 });
    if (current.reserved > 0) {
      return NextResponse.json({ error: "This inventory record has reserved stock for orders. Clear the reservations before deleting it." }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          userId: auth.user.id,
          action: "INVENTORY_DELETED",
          entity: "INVENTORY",
          entityId: current.id,
          description: `Deleted inventory record for ${current.product.name}${current.variant?.name ? " — " + current.variant.name : ""}.`,
          metadata: { productName: current.product.name, variantName: current.variant?.name ?? null, quantity: current.quantity },
        },
      });
      await tx.inventory.delete({ where: { id: current.id } });
    });
    return NextResponse.json({ success: true, inventoryId: current.id });
  } catch (error) {
    console.error("Dashboard inventory deletion error:", error);
    return NextResponse.json({ error: "Unable to delete inventory record." }, { status: 500 });
  }
}
