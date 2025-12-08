"use client";

import { ChatKit, useChatKit } from "@openai/chatkit-react";
import { useCallback, useMemo, useState } from "react";
import {
  CREATE_SESSION_ENDPOINT,
  GREETING,
  PLACEHOLDER_INPUT,
  STARTER_PROMPTS,
  WORKFLOW_ID,
  getThemeConfig,
} from "@/lib/chatkit";

type Status = "initializing" | "ready" | "error";

export function ChatKitPanel() {
  const [status, setStatus] = useState<Status>("initializing");
  const [error, setError] = useState<string | null>(null);
  const workflowConfigured = useMemo(
    () => Boolean(WORKFLOW_ID && !WORKFLOW_ID.startsWith("wf_replace")),
    [],
  );

  const getClientSecret = useCallback(async () => {
    if (!workflowConfigured) {
      const message =
        "Set NEXT_PUBLIC_CHATKIT_WORKFLOW_ID in your environment before using ChatKit.";
      setError(message);
      throw new Error(message);
    }
    setStatus("initializing");
    setError(null);
    const response = await fetch(CREATE_SESSION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflow: { id: WORKFLOW_ID },
        chatkit_configuration: {
          file_upload: { enabled: true },
        },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail =
        (payload && typeof payload.error === "string"
          ? payload.error
          : response.statusText) || "Failed to start session";
      setError(detail);
      setStatus("error");
      throw new Error(detail);
    }
    setStatus("ready");
    return payload.client_secret as string;
  }, [workflowConfigured]);

  const chatkit = useChatKit({
    api: { getClientSecret },
    theme: {
      colorScheme: "dark",
      ...getThemeConfig(),
    },
    startScreen: {
      greeting: GREETING,
      prompts: STARTER_PROMPTS,
    },
    composer: {
      placeholder: PLACEHOLDER_INPUT,
      attachments: { enabled: true },
    },
    onError: ({ error: err }) => {
      console.error("ChatKit error", err);
      setError(err instanceof Error ? err.message : "Unexpected error");
      setStatus("error");
    },
  });

  const statusBadge =
    status === "ready"
      ? "text-emerald-300"
      : status === "error"
        ? "text-rose-300"
        : "text-amber-300";

  return (
    <section className="rounded-3xl border border-indigo-700/50 bg-linear-to-b from-indigo-950 via-slate-950 to-black p-6 shadow-2xl shadow-indigo-900/50">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-300">
            Agent chat
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            ChatKit control room
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Powered by your Agent Builder workflow. Sessions are created on
            demand through OpenAI&rsquo;s hosted ChatKit service.
          </p>
        </div>
        <div className={`text-xs font-semibold uppercase ${statusBadge}`}>
          {status}
        </div>
      </header>

      {!workflowConfigured ? (
        <div className="mt-4 rounded-2xl border border-amber-600/40 bg-amber-500/5 p-4 text-sm text-amber-200">
          <p className="font-semibold">Workflow ID required</p>
          <p className="mt-2 text-amber-100/80">
            Set <code className="text-amber-50">NEXT_PUBLIC_CHATKIT_WORKFLOW_ID</code>{" "}
            in <code>.env.local</code> using the ID from Agent Builder.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-3xl border border-slate-800 bg-black/60 p-2">
          {error ? (
            <div className="rounded-2xl border border-rose-600/50 bg-rose-950/40 p-4 text-sm text-rose-100">
              <p className="font-semibold">Unable to start ChatKit</p>
              <p className="mt-2 text-rose-200">{error}</p>
            </div>
          ) : (
            <ChatKit
              control={chatkit.control}
              className="block h-[460px] w-full rounded-2xl"
            />
          )}
        </div>
      )}
    </section>
  );
}
