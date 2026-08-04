export const GOLDEN_PROFILES = [
  { id: "universal", label: "Universal", kind: "text", maxLength: 14_000 },
  {
    id: "geminiNatural",
    label: "Gemini Natural",
    kind: "text",
    maxLength: 14_000,
  },
  {
    id: "geminiPro",
    label: "Gemini Pro",
    kind: "text",
    maxLength: 14_000,
  },
  {
    id: "nanoBananaPro",
    label: "Nano Banana Pro",
    kind: "text",
    maxLength: 14_000,
  },
  {
    id: "gptImage2",
    label: "GPT Image 2",
    kind: "text",
    maxLength: 14_000,
  },
  { id: "flux", label: "FLUX", kind: "text", maxLength: 14_000 },
  { id: "sdxl", label: "SDXL", kind: "text", maxLength: 14_000 },
  {
    id: "standardJson",
    label: "Standard JSON",
    kind: "json",
    maxLength: 12_000,
  },
  {
    id: "safeJson",
    label: "Safe JSON",
    kind: "json",
    maxLength: 12_000,
  },
] as const;

export type GoldenProfile = (typeof GOLDEN_PROFILES)[number];
export type GoldenProfileId = GoldenProfile["id"];
