import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["ADMIN", "ANALYST"].includes(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, role: true } });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Unable to load account settings." }, { status: 500 });
  }
}
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["ADMIN", "ANALYST"].includes(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json() as { name?: string; currentPassword?: string; newPassword?: string };
    const name = body.name?.trim();
    if (!name || name.length > 100) return NextResponse.json({ error: "Enter a name up to 100 characters." }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    const data: { name: string; passwordHash?: string } = { name };
    if (body.newPassword) {
      if (body.newPassword.length < 8 || !body.currentPassword) return NextResponse.json({ error: "Enter your current password and a new password with at least 8 characters." }, { status: 400 });
      const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!valid) return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
      data.passwordHash = await bcrypt.hash(body.newPassword, 12);
    }
    const updated = await prisma.user.update({ where: { id: session.user.id }, data, select: { id: true, name: true, email: true, role: true } });
    await prisma.activityLog.create({ data: { userId: session.user.id, action: body.newPassword ? "ACCOUNT_SETTINGS_UPDATED" : "ACCOUNT_NAME_UPDATED", entity: "USER", entityId: session.user.id, description: "Dashboard account settings were updated." } });
    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Settings PATCH error:", error);
    return NextResponse.json({ error: "Unable to update account settings." }, { status: 500 });
  }
}
