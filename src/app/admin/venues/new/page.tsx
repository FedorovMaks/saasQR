import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/plans";
import { redirect } from "next/navigation";
import { VenueForm } from "@/components/admin/venue-form";

export default async function NewVenuePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const subscription = await hasActiveSubscription(session.user.id);
  if (!subscription.active) redirect("/admin");

  return (
    <div className="max-w-2xl">
      <VenueForm />
    </div>
  );
}
