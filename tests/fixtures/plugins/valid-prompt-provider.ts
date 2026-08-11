import type { PromptSectionProvider } from "../../../src/contracts/plugins/plugin-registrar";

export const validPromptSectionProvider = {
  id: "summary",
  provide: () => "Summary",
} satisfies PromptSectionProvider;
