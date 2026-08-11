import type { DiagnosticsPublicFacade } from "../diagnostics/public-facade";

export function installDiagnostics(
  target: Record<string, unknown>,
  diagnostics: DiagnosticsPublicFacade,
): void {
  Object.defineProperty(target, "PromptStudioV600", {
    configurable: false,
    enumerable: true,
    value: diagnostics,
    writable: false,
  });
}
