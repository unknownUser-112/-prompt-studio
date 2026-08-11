import type { BenchmarkReport, ModuleHealthContract } from "../contracts/core/module-health";
import type { Clock, MonotonicClock } from "../contracts/runtime/providers";

export class BenchmarkRunner {
  constructor(
    private readonly clock: Clock,
    private readonly monotonicClock: MonotonicClock,
  ) {}

  async run(modules: readonly ModuleHealthContract[]): Promise<readonly BenchmarkReport[]> {
    return Promise.all(modules.map((module) => this.runModule(module)));
  }

  private async runModule(module: ModuleHealthContract): Promise<BenchmarkReport> {
    const startedAt = this.clock.now();
    const start = this.monotonicClock.nowMilliseconds();
    const report = await module.benchmark();
    const durationMilliseconds = this.monotonicClock.nowMilliseconds() - start;

    return {
      durationMilliseconds,
      endedAt: this.clock.now(),
      error: report.error,
      moduleId: module.moduleId,
      moduleVersion: module.version,
      result: report.result,
      severity: report.severity,
      startedAt,
      testVersion: report.testVersion,
    };
  }
}
