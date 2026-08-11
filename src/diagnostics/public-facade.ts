import type {
  BenchmarkReport,
  DiagnosticErrorDetails,
  DiagnosticReport,
  ModuleHealthStatus,
} from "../contracts/core/module-health";
import type { RuntimeEnvironment } from "../contracts/runtime/runtime-environment";
import { BenchmarkRunner } from "./benchmark-runner";
import { DiagnosticRegistry, type ModuleHealthSummary } from "./diagnostic-registry";

export interface DiagnosticsBuildInformation {
  readonly version: string;
  readonly commit: string;
}

export interface DiagnosticsFacadeOptions {
  readonly build: DiagnosticsBuildInformation;
  readonly modules: ConstructorParameters<typeof DiagnosticRegistry>[0];
  readonly runtime: RuntimeEnvironment;
  readonly health?: Readonly<Record<string, unknown>>;
  readonly capabilities?: readonly string[];
}

export interface DiagnosticsPublicFacade {
  readonly version: string;
  readonly build: DiagnosticsBuildInformation;
  readonly health: Readonly<Record<string, unknown>>;
  readonly registry: readonly ModuleHealthSummary[];
  readonly capabilities: readonly string[];
  readonly benchmarks: Readonly<Record<string, never>>;
  runSelfTests(): Promise<readonly DiagnosticReport[]>;
  runBenchmarks(): Promise<readonly BenchmarkReport[]>;
  exportDiagnostics(): Promise<readonly DiagnosticReport[]>;
}

export function createDiagnosticsFacade(options: DiagnosticsFacadeOptions): DiagnosticsPublicFacade {
  const registry = new DiagnosticRegistry(options.modules);
  const benchmarks = new BenchmarkRunner(options.runtime.clock, options.runtime.monotonicClock);

  return deepFreeze({
    benchmarks: {},
    build: { ...options.build },
    capabilities: [...(options.capabilities ?? [])],
    exportDiagnostics: async () => sanitiseReports(await registry.runSelfTests()),
    health: { status: registry.health, ...(options.health ?? {}) },
    registry: registry.summary,
    runBenchmarks: async () => sanitiseBenchmarks(await benchmarks.run(registry.modulesForBenchmark)),
    runSelfTests: async () => sanitiseReports(await registry.runSelfTests()),
    version: options.build.version,
  });
}

function sanitiseReports(reports: readonly DiagnosticReport[]): readonly DiagnosticReport[] {
  return deepFreeze(reports.map((report) => sanitiseReport(report)));
}

function sanitiseBenchmarks(reports: readonly BenchmarkReport[]): readonly BenchmarkReport[] {
  return deepFreeze(reports.map((report) => ({
    durationMilliseconds: report.durationMilliseconds,
    endedAt: report.endedAt,
    ...(report.error === undefined ? {} : { error: sanitiseError(report.error) }),
    moduleId: report.moduleId,
    moduleVersion: report.moduleVersion,
    result: report.result,
    severity: report.severity,
    startedAt: report.startedAt,
    testVersion: report.testVersion,
  })));
}

function sanitiseReport(report: DiagnosticReport): DiagnosticReport {
  return {
    endedAt: report.endedAt,
    ...(report.error === undefined ? {} : { error: sanitiseError(report.error) }),
    moduleId: report.moduleId,
    moduleVersion: report.moduleVersion,
    result: report.result,
    severity: report.severity,
    startedAt: report.startedAt,
    testVersion: report.testVersion,
  };
}

function sanitiseError(error: DiagnosticErrorDetails): DiagnosticErrorDetails {
  return { code: error.code, message: error.message };
}

function deepFreeze<T>(value: T): T {
  if (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    !Object.isFrozen(value)
  ) {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}
