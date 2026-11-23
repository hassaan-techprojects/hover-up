import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can view activity logs." }, { status: 403 });
    }
    const [logs, users, loginCounts] = await Promise.all([
      prisma.activityLog.findMany({
        take: 250,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.user.findMany({
        where: { role: { in: ["ADMIN", "ANALYST"] } },
        select: { id: true, name: true, email: true, role: true, lastLoginAt: true, lastActiveAt: true, isActive: true },
        orderBy: { lastActiveAt: "desc" },
      }),
      prisma.activityLog.groupBy({
        by: ["userId"],
        where: { action: "DASHBOARD_LOGIN" },
        _count: { _all: true },
      }),
    ]);
    const counts = Object.fromEntries(loginCounts.map((item) => [item.userId ?? "", item._count._all]));
    return NextResponse.json({
      serverTime: new Date().toISOString(),
      logs: logs.map((log) => ({ ...log, createdAt: log.createdAt.toISOString() })),
      users: users.map((user) => ({
        ...user,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
        loginCount: counts[user.id] ?? 0,
      })),
    });
  } catch (error) {
    console.error("Activity logs API error:", error);
    return NextResponse.json({ error: "Unable to load activity logs." }, { status: 500 });
  }
}
