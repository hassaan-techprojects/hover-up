import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getDashboardCatalogStaff() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 } as const;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return { error: "Unauthorized", status: 401 } as const;
  if (!["ADMIN", "ANALYST"].includes(user.role)) {
    return { error: "Forbidden. Catalogue staff access required.", status: 403 } as const;
  }
  return { user } as const;
}
