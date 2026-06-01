import { NextResponse } from "next/server";
import { getApiUser, unauthorized, verifyVenueOwner } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/config";
import QRCode from "qrcode";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { venueId } = await params;
  const venue = await verifyVenueOwner(venueId, user.id);
  if (!venue) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }
  if (venue === "forbidden") {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  // Get venue slug for URL
  const venueData = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { slug: true, name: true },
  });

  if (!venueData) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  // Always point the QR at the canonical public domain (not the request
  // origin, which could be localhost/vercel.app).
  const menuUrl = `${SITE_URL}/${venueData.slug}`;

  // Generate QR code as PNG buffer
  const qrBuffer = await QRCode.toBuffer(menuUrl, {
    type: "png",
    width: 1024,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });

  return new NextResponse(new Uint8Array(qrBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${venueData.slug}.png"`,
      "Cache-Control": "no-cache",
    },
  });
}
