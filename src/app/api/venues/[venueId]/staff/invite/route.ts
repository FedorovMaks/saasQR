import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getApiUser,
  unauthorized,
  forbidden,
  notFoundResponse,
  verifyVenueOwner,
} from "@/lib/auth-guard";

// POST — create an invite link for a venue
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { venueId } = await params;
  const venue = await verifyVenueOwner(venueId, user.id);
  if (!venue) return notFoundResponse();
  if (venue === "forbidden") return forbidden();

  // Invite valid for 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.staffInvite.create({
    data: { venueId, expiresAt },
  });

  return NextResponse.json({
    token: invite.token,
    expiresAt: invite.expiresAt,
  }, { status: 201 });
}
