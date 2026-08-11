import type {
  DiagnosticReport,
  ModuleHealthContract,
  ModuleHealthStatus,
} from "../contracts/core/module-health";

export interface ModuleHealthSummary {
  readonly moduleId: string;
  readonly version: string;
  readonly status: ModuleHealthStatus;
  readonly testCount: number;
}

export class DiagnosticRegistry {
  constructor(private readonly modules: readonly ModuleHealthContract[]) {}

  get summary(): readonly ModuleHealthSummary[] {
    return this.modules.map((module) => ({
      moduleId: module.moduleId,
      status: module.status,
      testCount: module.tests.length,
      version: module.version,
    }));
  }

  get health(): ModuleHealthStatus {
    if (this.modules.some((module) => module.status === "failed")) return "failed";
    if (this.modules.some((module) => module.status === "degraded")) return "degraded";
    if (this.modules.length > 0 && this.modules.every((module) => module.status === "disabled")) {
      return "disabled";
    }
    return "ready";
  }

  async runSelfTests(): Promise<readonly DiagnosticReport[]> {
    return Promise.all(this.modules.map((module) => module.diagnose()));
  }

  get modulesForBenchmark(): readonly ModuleHealthContract[] {
    return this.modules;
  }
}
