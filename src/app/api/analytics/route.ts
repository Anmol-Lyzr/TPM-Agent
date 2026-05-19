import { NextResponse } from "next/server";
import { getDashboardAnalytics } from "@/lib/db/sessions";

export const runtime = "nodejs";

export async function GET() {
  try {
    const analytics = await getDashboardAnalytics();
    return NextResponse.json({
      overallProjects: analytics.overallProjects,
      completedProjects: analytics.completedProjects,
      totalBugs: analytics.totalBugs,
      totalSessions: analytics.totalSessions,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
