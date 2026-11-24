import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/account/login?callbackUrl=%2Fdashboard");
  }

  // Read the current role from the database so a stale JWT cannot preserve
  // dashboard access after an account is disabled or its role is changed.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    redirect("/account/login");
  }

  if (user.role === "CUSTOMER") {
    redirect("/account/orders");
  }

  if (user.role !== "ADMIN" && user.role !== "ANALYST") {
    redirect("/account/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
