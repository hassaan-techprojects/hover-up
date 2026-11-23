import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["ADMIN", "ANALYST"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastActiveAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dashboard heartbeat error:", error);
    return NextResponse.json({ error: "Unable to update activity." }, { status: 500 });
  }
}
