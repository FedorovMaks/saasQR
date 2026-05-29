import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Check if a user's email is verified (used by login form to show proper error)
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ verified: true }); // Don't reveal info
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerified: true, isSuperAdmin: true },
    });

    if (!user) {
      return NextResponse.json({ verified: true }); // Don't reveal user existence
    }

    // Superadmins always pass
    if (user.isSuperAdmin) {
      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ verified: user.emailVerified });
  } catch {
    return NextResponse.json({ verified: true });
  }
}
