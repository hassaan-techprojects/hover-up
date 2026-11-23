import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function adminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") return null;
  return session;
}
export async function GET() {
  try {
    if (!(await adminSession())) return NextResponse.json({ error: "Only administrators can manage team members." }, { status: 403 });
    const users = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "ANALYST"] } },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true, lastActiveAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Team GET error:", error);
    return NextResponse.json({ error: "Unable to load team members." }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const session = await adminSession();
    if (!session) return NextResponse.json({ error: "Only administrators can create team members." }, { status: 403 });
    const body = await request.json() as { name?: string; email?: string; password?: string; role?: string };
    const name = body.name?.trim() || "";
    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";
    const role = body.role;
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || !["ADMIN", "ANALYST"].includes(role || "")) {
      return NextResponse.json({ error: "Enter a name, valid email, password of at least 8 characters, and choose Admin or Analyst." }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "An account already exists with this email." }, { status: 409 });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: role as "ADMIN" | "ANALYST" },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    await prisma.activityLog.create({
      data: { userId: session.user.id, action: "TEAM_MEMBER_CREATED", entity: "USER", entityId: user.id, description: `A new ${role} dashboard account was created.` },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Team POST error:", error);
    return NextResponse.json({ error: "Unable to create team member." }, { status: 500 });
  }
}
export async function PATCH(request: Request) {
  try {
    const session = await adminSession();
    if (!session) return NextResponse.json({ error: "Only administrators can update team members." }, { status: 403 });
    const body = await request.json() as { userId?: string; isActive?: boolean };
    if (!body.userId || typeof body.isActive !== "boolean") return NextResponse.json({ error: "A user and active status are required." }, { status: 400 });
    if (body.userId === session.user.id && !body.isActive) return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
    const target = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, role: true } });
    if (!target || !["ADMIN", "ANALYST"].includes(target.role)) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    const user = await prisma.user.update({ where: { id: body.userId }, data: { isActive: body.isActive }, select: { id: true, isActive: true } });
    await prisma.activityLog.create({
      data: { userId: session.user.id, action: body.isActive ? "TEAM_MEMBER_ACTIVATED" : "TEAM_MEMBER_DEACTIVATED", entity: "USER", entityId: user.id, description: body.isActive ? "A dashboard team account was activated." : "A dashboard team account was deactivated." },
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Team PATCH error:", error);
    return NextResponse.json({ error: "Unable to update team member." }, { status: 500 });
  }
}
