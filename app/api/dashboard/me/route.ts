import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["ADMIN", "ANALYST"].includes(session.user.role)) {
      return NextResponse.json({ error: "You are not allowed to access this dashboard." }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, role: true, email: true },
    });
    if (!user) return NextResponse.json({ error: "Dashboard account not found." }, { status: 404 });

    return NextResponse.json({
      name: user.name?.trim() || (user.role === "ANALYST" ? "Analyst" : "Administrator"),
      role: user.role,
      email: user.email,
    });
  } catch (error) {
    console.error("Dashboard identity API error:", error);
    return NextResponse.json({ error: "Unable to load dashboard account." }, { status: 500 });
  }
}
