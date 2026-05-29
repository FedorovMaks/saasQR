import { NextResponse } from "next/server";

// Plan switching is disabled — use payment integration or superadmin panel
export async function POST() {
  return NextResponse.json(
    { error: "Смена тарифа доступна только через оплату" },
    { status: 403 }
  );
}
