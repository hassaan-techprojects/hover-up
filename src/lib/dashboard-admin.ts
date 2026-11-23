
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getDashboardAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return {
      error: "Unauthorized",
      status: 401,
    } as const;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return {
      error: "Unauthorized",
      status: 401,
    } as const;
  }

  if (user.role !== "ADMIN") {
    return {
      error: "Forbidden. Admin access required.",
      status: 403,
    } as const;
  }

  return { user } as const;
}
