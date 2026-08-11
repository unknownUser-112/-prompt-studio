export type ModuleHealthStatus = "ready" | "degraded" | "failed" | "disabled";

export interface DiagnosticTestDefinition {
  readonly id: string;
  readonly version: string;
}

export interface DiagnosticErrorDetails {
  readonly code: string;
  readonly message: string;
  readonly [detail: string]: unknown;
}

export interface DiagnosticReport {
  readonly moduleId: string;
  readonly moduleVersion: string;
  readonly testVersion: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly result: "passed" | "failed";
  readonly severity: "info" | "warning" | "error";
  readonly error?: DiagnosticErrorDetails;
}

export interface BenchmarkReport {
  readonly moduleId: string;
  readonly moduleVersion: string;
  readonly testVersion: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly durationMilliseconds: number;
  readonly result: "passed" | "failed";
  readonly severity: "info" | "warning" | "error";
  readonly error?: DiagnosticErrorDetails;
}

export interface ModuleHealthContract {
  readonly moduleId: string;
  readonly version: string;
  readonly status: ModuleHealthStatus;
  diagnose(): Promise<DiagnosticReport>;
  benchmark(): Promise<BenchmarkReport>;
  readonly tests: readonly DiagnosticTestDefinition[];
}
