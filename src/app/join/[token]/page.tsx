import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { JoinForm } from "@/components/staff/join-form";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await prisma.staffInvite.findUnique({
    where: { token },
    include: { venue: { select: { name: true } } },
  });

  if (!invite || invite.isUsed || invite.expiresAt < new Date()) {
    notFound();
  }

  return (
    <JoinForm
      token={token}
      venueName={invite.venue.name}
    />
  );
}
