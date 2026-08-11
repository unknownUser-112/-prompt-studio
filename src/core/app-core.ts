import type { RuntimeEnvironment } from "../contracts/runtime/runtime-environment";
import type { CommandDispatcher } from "./command-dispatcher";
import type { LifecycleFacade, LifecycleState } from "./lifecycle";
import type { QueryDispatcher } from "./query-dispatcher";

export interface AppCoreDependencies {
  readonly commandDispatcher: CommandDispatcher;
  readonly lifecycle: LifecycleFacade;
  readonly queryDispatcher: QueryDispatcher;
  readonly runtime: RuntimeEnvironment;
}

export interface AppHealth {
  readonly lifecycle: LifecycleState;
}

export class AppCore {
  constructor(private readonly dependencies: AppCoreDependencies) {}

  get health(): AppHealth {
    return { lifecycle: this.dependencies.lifecycle.lifecycleState };
  }

  start(): Promise<void> {
    return this.dependencies.lifecycle.start();
  }

  stop(): Promise<void> {
    return this.dependencies.lifecycle.stop();
  }
}
