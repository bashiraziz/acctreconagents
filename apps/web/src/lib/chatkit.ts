import type { StartScreenPrompt, ThemeOption } from "@openai/chatkit";

export const WORKFLOW_ID =
  process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID?.trim() ?? "";

export const CREATE_SESSION_ENDPOINT = "/api/create-session";

export const STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    label: "What can you do?",
    prompt: "What can you do?",
    icon: "circle-question",
  },
  {
    label: "Explain account variance",
    prompt: "Explain why account 1000 is out of balance.",
    icon: "sparkles",
  },
];

export const GREETING = "Need help reconciling? I'm ready.";
export const PLACEHOLDER_INPUT = "Ask the assistant anything…";

export const getThemeConfig = (): ThemeOption => ({
  color: {
    grayscale: {
      hue: 215,
      tint: 8,
      shade: -2,
    },
    accent: {
      primary: "#f0fdf4",
      level: 1,
    },
  },
  radius: "round",
});
