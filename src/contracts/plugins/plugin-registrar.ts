import type { ConstraintProvider } from "../../domain/contracts/constraints/provider";

export type CapabilityId = string;

export interface ConstraintContribution {
  readonly id: string;
  readonly provider: ConstraintProvider;
}

export interface PromptSectionProvider {
  readonly id: string;
  provide(): string;
}

export interface ProfileLayoutContribution {
  readonly id: string;
}

export interface TextRenderer {
  readonly id: string;
}

export interface JsonRenderer {
  readonly id: string;
}

export interface UiBinding {
  readonly id: string;
}

export interface Migration {
  readonly id: string;
}

export interface DiagnosticContribution {
  readonly id: string;
}

export interface BenchmarkContribution {
  readonly id: string;
}

export interface PluginRegistrar {
  registerConstraint(contribution: ConstraintContribution): void;
  registerPromptSection(provider: PromptSectionProvider): void;
  registerProfileLayout(contribution: ProfileLayoutContribution): void;
  registerTextRenderer(renderer: TextRenderer): void;
  registerJsonRenderer(renderer: JsonRenderer): void;
  registerUiBinding(binding: UiBinding): void;
  registerMigration(migration: Migration): void;
  registerDiagnostic(diagnostic: DiagnosticContribution): void;
  registerBenchmark(benchmark: BenchmarkContribution): void;
  registerCapability(capability: CapabilityId): void;
}
