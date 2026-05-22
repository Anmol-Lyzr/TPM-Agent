import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { computeDashboardAnalytics } from "@/lib/analytics";
import type { TpmSessionDocument } from "@/lib/db/sessions";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db
      .collection<TpmSessionDocument>("sessions")
      .find({}, { projection: { sessionId: 1, projectName: 1, payload: 1 } })
      .limit(200)
      .toArray();

    const analytics = computeDashboardAnalytics(
      docs.map(d => ({
        sessionId: d.sessionId,
        projectName: d.projectName,
        payload: d.payload ?? null,
      }))
    );

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
