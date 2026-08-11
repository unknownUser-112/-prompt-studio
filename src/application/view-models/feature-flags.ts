export interface FeatureFlagSnapshot {
  readonly characterLibrary: boolean;
  readonly outfitLibrary: boolean;
  readonly sceneLibrary: boolean;
  readonly promptLibrary: boolean;
  readonly imageLibrary: boolean;
  readonly revisionHistoryUi: boolean;
  readonly cloudSync: false;
  readonly aiKnowledgeBase: false;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return Object.freeze(value);
}

export const featureFlagSnapshot: FeatureFlagSnapshot = deepFreeze({
  aiKnowledgeBase: false,
  characterLibrary: false,
  cloudSync: false,
  imageLibrary: false,
  outfitLibrary: false,
  promptLibrary: false,
  revisionHistoryUi: false,
  sceneLibrary: false,
});
