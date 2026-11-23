
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash || !user.isActive) {
  return null;
}

        const passwordValid = await bcrypt.compare(
  credentials.password,
  user.passwordHash
);

        if (!passwordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }

      return session;
    },
  },

  events: {
    async signIn({ user }) {
      if (!user.id || !["ADMIN", "ANALYST"].includes(user.role)) return;
      const now = new Date();
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: now, lastActiveAt: now },
      });
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "DASHBOARD_LOGIN",
          entity: "SESSION",
          description: `${user.role} signed in to the dashboard.`,
        },
      });
    },
    async signOut({ token }) {
      const userId = typeof token?.id === "string" ? token.id : null;
      if (!userId) return;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, lastLoginAt: true },
      });
      if (!user || !["ADMIN", "ANALYST"].includes(user.role)) return;
      const sessionMinutes = user.lastLoginAt
        ? Math.max(0, Math.round((Date.now() - user.lastLoginAt.getTime()) / 60000))
        : null;
      await prisma.activityLog.create({
        data: {
          userId,
          action: "DASHBOARD_LOGOUT",
          entity: "SESSION",
          description: `${user.role} signed out of the dashboard.`,
          metadata: { sessionMinutes },
        },
      });
    },
  },

  pages: {
    signIn: "/dashboard/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
