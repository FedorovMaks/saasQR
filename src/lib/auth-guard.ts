import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function getApiUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

export function unauthorized() {
  return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
}

export function notFoundResponse() {
  return NextResponse.json({ error: "Не найдено" }, { status: 404 });
}

export async function verifyVenueOwner(venueId: string, userId: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { id: true, ownerId: true, isActive: true },
  });
  if (!venue || !venue.isActive) return null;
  if (venue.ownerId !== userId) return "forbidden" as const;
  return venue;
}
