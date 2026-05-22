import { NextResponse } from "next/server";
import { listCtaAggregates } from "@/lib/db/sessions";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await listCtaAggregates();
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
