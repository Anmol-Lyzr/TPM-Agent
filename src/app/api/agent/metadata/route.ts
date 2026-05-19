import { NextResponse } from "next/server";

import { AGENT_ID, CONSOLE_AGENT_ID } from "@/lib/constants";
import { TPM_AGENT_METADATA } from "@/lib/tpmAgentMetadata";

function maskValue(value: string | undefined, visible = 4): string {
  if (!value?.trim()) return "—";
  const v = value.trim();
  if (v.length <= visible) return "••••";
  return `${v.slice(0, visible)}${"•".repeat(Math.min(12, v.length - visible))}`;
}

export async function GET() {
  const apiKey = process.env.LYZR_API_KEY?.trim();
  const agentId = process.env.LYZR_AGENT_ID?.trim() || AGENT_ID;
  const consoleAgentId =
    process.env.LYZR_CONSOLE_AGENT_ID?.trim() || CONSOLE_AGENT_ID;
  const userId = process.env.LYZR_USER_ID?.trim();
  const mongoUri = process.env.MONGODB_URI?.trim();

  return NextResponse.json({
    ...TPM_AGENT_METADATA,
    runtime: {
      apiKeyConfigured: Boolean(apiKey),
      userIdConfigured: Boolean(userId),
      mongoConfigured: Boolean(mongoUri),
      meetingAgentId: agentId,
      consoleAgentId,
      userIdMasked: maskValue(userId),
      dbName: process.env.MONGODB_DB_NAME?.trim() || "TPM",
    },
  });
}
