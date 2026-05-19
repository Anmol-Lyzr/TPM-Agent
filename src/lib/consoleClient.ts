export interface ConsoleChatResponse {
  reply: string;
  session_id: string;
  meeting_attached?: boolean;
}

export async function postConsoleChat(body: {
  message: string;
  session_id?: string;
  meeting_session_id?: string;
}): Promise<ConsoleChatResponse> {
  const res = await fetch("/api/console/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as ConsoleChatResponse & { error?: string };

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }

  return data;
}
