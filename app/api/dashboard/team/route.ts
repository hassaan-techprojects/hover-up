import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboardAdmin } from "@/lib/dashboard-admin";
import { prisma } from "@/lib/prisma";

const roles = ["ADMIN", "ANALYST", "CUSTOMER"] as const;

export async function GET() {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const users = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "ANALYST"] } },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Dashboard team GET error:", error);
    return NextResponse.json({ error: "Unable to load team members." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const session = await getServerSession(authOptions);
    const body = await request.json() as { userId?: string; role?: string; isActive?: boolean };
    if (!body.userId || (body.role !== undefined && !roles.includes(body.role as typeof roles[number])) || (body.isActive !== undefined && typeof body.isActive !== "boolean")) {
      return NextResponse.json({ error: "Provide a valid team member, role or account status." }, { status: 400 });
    }
    const current = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, role: true, isActive: true } });
    if (!current || current.role === "CUSTOMER") return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    if (current.id === session?.user?.id && (body.role !== undefined && body.role !== "ADMIN" || body.isActive === false)) {
      return NextResponse.json({ error: "You cannot remove your own administrator access." }, { status: 400 });
    }
    const removingAdmin = current.role === "ADMIN" && current.isActive && (body.role !== undefined && body.role !== "ADMIN" || body.isActive === false);
    if (removingAdmin) {
      const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
      if (activeAdmins <= 1) return NextResponse.json({ error: "At least one active administrator must remain." }, { status: 409 });
    }
    const data: { role?: typeof roles[number]; isActive?: boolean } = {};
    if (body.role !== undefined) data.role = body.role as typeof roles[number];
    if (body.isActive !== undefined) data.isActive = body.isActive;
    const user = await prisma.user.update({ where: { id: body.userId }, data, select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true } });
    await prisma.activityLog.create({
      data: {
        userId: auth.user.id,
        action: "TEAM_MEMBER_UPDATED",
        entity: "USER",
        entityId: user.id,
        description: "Updated team access for " + user.email,
        metadata: { role: user.role, isActive: user.isActive },
      },
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Dashboard team PATCH error:", error);
    return NextResponse.json({ error: "Unable to update team member." }, { status: 500 });
  }
}


export async function DELETE(request: Request) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json() as { userId?: string };
    if (!body.userId || typeof body.userId !== "string") {
      return NextResponse.json({ error: "A valid team member is required." }, { status: 400 });
    }

    if (body.userId === auth.user.id) {
      return NextResponse.json({ error: "You cannot remove your own account." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: body.userId },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!target || target.role === "CUSTOMER") {
        throw new Error("TEAM_MEMBER_NOT_FOUND");
      }

      if (target.role === "ADMIN" && target.isActive) {
        const activeAdmins = await tx.user.count({ where: { role: "ADMIN", isActive: true } });
        if (activeAdmins <= 1) {
          throw new Error("LAST_ACTIVE_ADMIN");
        }
      }

      await tx.activityLog.create({
        data: {
          userId: auth.user.id,
          action: "TEAM_MEMBER_DELETED",
          entity: "USER",
          entityId: target.id,
          description: "Removed team member " + target.email,
          metadata: { email: target.email, role: target.role },
        },
      });

      await tx.user.delete({ where: { id: target.id } });
    });

    return NextResponse.json({ success: true, userId: body.userId });
  } catch (error) {
    if (error instanceof Error && error.message === "TEAM_MEMBER_NOT_FOUND") {
      return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "LAST_ACTIVE_ADMIN") {
      return NextResponse.json({ error: "At least one active administrator must remain." }, { status: 409 });
    }
    console.error("Dashboard team DELETE error:", error);
    return NextResponse.json({ error: "Unable to remove team member." }, { status: 500 });
  }
}
