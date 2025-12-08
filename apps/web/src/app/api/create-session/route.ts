import { WORKFLOW_ID } from "@/lib/chatkit";

export const runtime = "edge";

const DEFAULT_API_BASE = "https://api.openai.com";
const SESSION_COOKIE = "chatkit_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

type RequestPayload = {
  workflow?: { id?: string | null } | null;
  chatkit_configuration?: {
    file_upload?: { enabled?: boolean };
  };
};

export async function POST(request: Request): Promise<Response> {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return json({ error: "Missing OPENAI_API_KEY" }, 500);
    }

    const supplied = await parseJson<RequestPayload>(request);
    const workflowId = supplied?.workflow?.id ?? WORKFLOW_ID;
    if (!workflowId) {
      return json(
        { error: "Set NEXT_PUBLIC_CHATKIT_WORKFLOW_ID in your environment." },
        400,
      );
    }

    const userId = await resolveUserId(request);
    const response = await fetch(
      `${process.env.CHATKIT_API_BASE ?? DEFAULT_API_BASE}/v1/chatkit/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
          "OpenAI-Beta": "chatkit_beta=v1",
        },
        body: JSON.stringify({
          workflow: { id: workflowId },
          user: userId.value,
          chatkit_configuration: {
            file_upload: {
              enabled:
                supplied?.chatkit_configuration?.file_upload?.enabled ?? true,
            },
          },
        }),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      return json(
        { error: payload?.error ?? response.statusText, details: payload },
        response.status,
      );
    }

    return json(
      {
        client_secret: payload.client_secret,
        expires_after: payload.expires_after,
      },
      200,
      userId.cookie,
    );
  } catch (error) {
    console.error("[create-session] unexpected", error);
    return json({ error: "Unexpected error" }, 500);
  }
}

async function parseJson<T>(req: Request): Promise<T | null> {
  try {
    const text = await req.text();
    if (!text) {
      return null;
    }
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function resolveUserId(request: Request): Promise<{
  value: string;
  cookie: string | null;
}> {
  const existing = getCookie(request.headers.get("cookie"), SESSION_COOKIE);
  if (existing) {
    return { value: existing, cookie: null };
  }
  const generated =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return {
    value: generated,
    cookie: serializeCookie(generated),
  };
}

function getCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  return cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .map((entry) => entry.split("="))
    .find(([key]) => key === name)?.[1] ?? null;
}

function serializeCookie(value: string) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function json(payload: unknown, status: number, cookie?: string | null) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookie) {
    headers.append("Set-Cookie", cookie);
  }
  return new Response(JSON.stringify(payload), { status, headers });
}
