type Awaitable<T> = T | Promise<T>;

export type LifecycleState = "stopped" | "started";

export interface LifecycleComponent {
  readonly id: string;
  start(): Awaitable<void>;
  stop(): Awaitable<void>;
}

export class LifecycleFacade {
  private state: LifecycleState = "stopped";

  constructor(private readonly components: readonly LifecycleComponent[]) {}

  get lifecycleState(): LifecycleState {
    return this.state;
  }

  async start(): Promise<void> {
    if (this.state === "started") return;

    for (const component of this.components) {
      await component.start();
    }
    this.state = "started";
  }

  async stop(): Promise<void> {
    if (this.state === "stopped") return;

    for (const component of [...this.components].reverse()) {
      await component.stop();
    }
    this.state = "stopped";
  }
}
