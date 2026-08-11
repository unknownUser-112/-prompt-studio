export const STORE_NAMES = [
  "Projects",
  "ProjectRevisions",
  "Profiles",
  "Characters",
  "Outfits",
  "Scenes",
  "PromptTemplates",
  "GenerationHistory",
  "ImageAssets",
  "Tags",
  "Settings",
  "Trash",
  "SyncQueue",
] as const;

export type StoreName = (typeof STORE_NAMES)[number];
