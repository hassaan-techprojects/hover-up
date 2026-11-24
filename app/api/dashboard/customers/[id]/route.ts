import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardAdmin } from "@/lib/dashboard-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, userId: true, firstName: true, lastName: true, orders: { select: { id: true } } },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const hasOrderHistory = customer.orders.length > 0;

    await prisma.$transaction(async (tx) => {
      if (customer.userId) {
        await tx.user.deleteMany({ where: { id: customer.userId } });
      }

      // Remove personal customer data that is not needed for order records.
      await tx.address.deleteMany({ where: { customerId: id } });
      await tx.cart.deleteMany({ where: { customerId: id } });
      await tx.wishlist.deleteMany({ where: { customerId: id } });
      await tx.review.deleteMany({ where: { customerId: id } });

      if (hasOrderHistory) {
        // Keep order rows for accounting, but remove personal details from their address snapshots.
        await tx.order.updateMany({
          where: { customerId: id },
          data: {
            shippingAddress: { recipient: "Deleted Customer", addressLine1: "Removed", addressLine2: "", city: "Removed", state: "Removed", postalCode: "", country: "" },
            billingAddress: { recipient: "Deleted Customer", addressLine1: "Removed", addressLine2: "", city: "Removed", state: "Removed", postalCode: "", country: "" },
          },
        });
        // Order.customerId is intentionally retained so financial and fulfilment
        // history remains valid. Replace identifying customer fields instead.
        await tx.customer.update({
          where: { id },
          data: {
            firstName: "Deleted",
            lastName: "Customer",
            email: `deleted-${id}@deleted.invalid`,
            phone: null,
            userId: null,
          },
        });
      } else {
        await tx.customer.delete({ where: { id } });
      }

      await tx.activityLog.create({
        data: {
          userId: auth.user.id,
          action: "CUSTOMER_DELETED",
          entity: "CUSTOMER",
          entityId: id,
          description: hasOrderHistory
            ? "Anonymised customer while preserving order history"
            : "Deleted customer without order history",
          metadata: { preservedOrderHistory: hasOrderHistory, orderCount: customer.orders.length },
        },
      });
    });

    return NextResponse.json({
      message: hasOrderHistory
        ? "Customer personal data deleted. Existing order history was preserved."
        : "Customer deleted successfully.",
      preservedOrderHistory: hasOrderHistory,
    });
  } catch (error) {
    console.error("Dashboard customer DELETE error:", error);
    return NextResponse.json({ error: "Unable to delete this customer." }, { status: 500 });
  }
}
