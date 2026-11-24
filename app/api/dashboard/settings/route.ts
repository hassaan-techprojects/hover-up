import { NextResponse } from "next/server";
import { getDashboardAdmin } from "@/lib/dashboard-admin";
import { prisma } from "@/lib/prisma";

const allowedKeys = ["store_name", "support_email", "support_phone", "store_address", "currency"] as const;

export async function GET() {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const settings = await prisma.storeSetting.findMany({ where: { key: { in: [...allowedKeys] } } });
    return NextResponse.json({ settings: Object.fromEntries(settings.map(item => [item.key, item.value])) });
  } catch (error) {
    console.error("Dashboard settings GET error:", error);
    return NextResponse.json({ error: "Unable to load store settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const body = await request.json() as { settings?: Record<string, unknown> };
    if (!body.settings || typeof body.settings !== "object" || Array.isArray(body.settings)) {
      return NextResponse.json({ error: "Provide valid store settings." }, { status: 400 });
    }
    const updates = Object.entries(body.settings).filter(([key, value]) => allowedKeys.includes(key as typeof allowedKeys[number]) && typeof value === "string").slice(0, allowedKeys.length);
    await prisma.$transaction(updates.map(([key, value]) => prisma.storeSetting.upsert({
      where: { key },
      create: { key, value: value as string },
      update: { value: value as string },
    })));
    if (updates.length) {
      await prisma.activityLog.create({
        data: { userId: auth.user.id, action: "STORE_SETTINGS_UPDATED", entity: "STORE_SETTING", description: "Updated store contact and display settings", metadata: { keys: updates.map(([key]) => key) } },
      });
    }
    const settings = await prisma.storeSetting.findMany({ where: { key: { in: [...allowedKeys] } } });
    return NextResponse.json({ settings: Object.fromEntries(settings.map(item => [item.key, item.value])) });
  } catch (error) {
    console.error("Dashboard settings PATCH error:", error);
    return NextResponse.json({ error: "Unable to save store settings." }, { status: 500 });
  }
}
