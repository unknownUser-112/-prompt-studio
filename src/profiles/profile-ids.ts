export const PROFILE_IDS = {
  universal: "universal",
  geminiNatural: "geminiNatural",
  geminiPro: "geminiPro",
  nanoBananaPro: "nanoBananaPro",
  gptImage2: "gptImage2",
  flux: "flux",
  sdxl: "sdxl",
  standardJson: "standardJson",
  safeJson: "safeJson",
} as const;

export type ProfileId = typeof PROFILE_IDS[keyof typeof PROFILE_IDS];
