import { NextRequest, NextResponse } from "next/server";
import { getTpmBackendUrl } from "@/lib/atlassian/client";

export const runtime = "nodejs";

const FORWARD_HEADERS = ["content-type", "accept"];

async function proxyAtlassian(
  req: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  const subpath = pathSegments.join("/");
  const incoming = new URL(req.url);
  const target = `${getTpmBackendUrl()}/api/atlassian/${subpath}${incoming.search}`;

  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("content-type") && req.method !== "GET" && req.method !== "HEAD") {
    headers.set("content-type", "application/json");
  }

  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

  let res: Response;
  try {
    res = await fetch(target, {
      method: req.method,
      headers,
      body: body || undefined,
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return NextResponse.json(
      {
        error: `TPM backend unreachable at ${getTpmBackendUrl()}: ${message}`,
      },
      { status: 502 }
    );
  }

  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "application/json";
  if (text.trim().startsWith("<")) {
    return NextResponse.json(
      {
        error:
          res.status === 502
            ? "TPM backend or Atlassian upstream returned 502 Bad Gateway. Retry after the backend is stable."
            : `TPM backend returned HTML instead of JSON (${res.status})`,
      },
      { status: res.status }
    );
  }
  return new NextResponse(text || "{}", {
    status: res.status,
    headers: { "Content-Type": contentType },
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyAtlassian(req, path ?? []);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
