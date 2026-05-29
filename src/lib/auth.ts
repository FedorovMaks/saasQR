import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Введите email и пароль");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            staffRoles: {
              where: { isActive: true },
              select: { venueId: true, role: true },
            },
          },
        });

        if (!user) {
          throw new Error("Неверный email или пароль");
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          throw new Error("Неверный email или пароль");
        }

        // Determine if user is staff (waiter) — has staff roles but no venues as owner
        const isOwner = await prisma.venue.count({
          where: { ownerId: user.id, isActive: true },
        });

        const staffVenueIds = user.staffRoles.map((s) => s.venueId);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          isSuperAdmin: user.isSuperAdmin,
          role: isOwner > 0 ? "owner" : staffVenueIds.length > 0 ? "waiter" : "owner",
          staffVenueIds,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const u = user as { plan?: string; role?: string; staffVenueIds?: string[]; isSuperAdmin?: boolean };
        token.plan = u.plan || "BASIC";
        token.role = u.role || "owner";
        token.staffVenueIds = u.staffVenueIds || [];
        token.isSuperAdmin = u.isSuperAdmin || false;
      }

      // Refresh plan from DB every 60 seconds to pick up plan changes
      const now = Math.floor(Date.now() / 1000);
      if (!token.planRefreshedAt || now - (token.planRefreshedAt as number) > 60) {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { plan: true, planExpiresAt: true },
          });
          if (freshUser) {
            // Check expiry
            const isExpired = freshUser.plan !== "BASIC" && freshUser.planExpiresAt && freshUser.planExpiresAt < new Date();
            token.plan = isExpired ? "BASIC" : freshUser.plan;
          }
          token.planRefreshedAt = now;
        } catch {
          // ignore — use cached plan
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as {
          id: string;
          plan: string;
          role: string;
          staffVenueIds: string[];
          isSuperAdmin: boolean;
        };
        u.id = token.id as string;
        u.plan = (token.plan as string) || "BASIC";
        u.role = (token.role as string) || "owner";
        u.staffVenueIds = (token.staffVenueIds as string[]) || [];
        u.isSuperAdmin = (token.isSuperAdmin as boolean) || false;
      }
      return session;
    },
  },
};
