export interface ReadonlyKeyValueSource {
  getItem(key: string): string | null;
}

export const V500_CURRENT_STORAGE_KEY = "prompt-studio-v500-5-1-diagnostic-pipeline-fix";

export const V500_LEGACY_STORAGE_KEYS = [
  "prompt-studio-v500-5-0-ux-prompt-engine",
  "prompt-studio-v500-4-1-registry-architecture-cleanup",
  "prompt-studio-v500-4-0-registry-architecture-final",
  "prompt-studio-v500-3-2-step4-2-automatic-module-tests",
  "prompt-studio-v500-3-2-registry-foundation",
  "prompt-studio-v500-3-1-brustanatomie-erweiterung",
  "prompt-studio-v500-3-0-prompt-quality-refinement",
  "prompt-studio-v500-2-8-step9-final-audit",
  "prompt-studio-v500-2-6-step8-validated",
  "prompt-studio-v500-2-4-phase2-validated",
  "prompt-studio-v500-2-3-clothing-pipeline-fix",
  "prompt-studio-v500-2-2-cache-fix",
  "prompt-studio-v500-2-1-stabilized",
  "prompt-studio-v402",
  "prompt-studio-v500-2-ultimate-final",
] as const;

export const V500_PROFILE_LIBRARY_KEY = "prompt-studio-profile-library-v1";

export const V500_STORAGE_KEY_PRIORITY = [
  V500_CURRENT_STORAGE_KEY,
  ...V500_LEGACY_STORAGE_KEYS,
] as const;
