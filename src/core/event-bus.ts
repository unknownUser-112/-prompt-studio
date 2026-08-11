import type { DomainEvent } from "../contracts/core/messages";

type Awaitable<T> = T | Promise<T>;

export type EventSubscriber = (event: DomainEvent<unknown>) => Awaitable<void>;

export class EventBus {
  private readonly subscribers: EventSubscriber[] = [];

  subscribe(subscriber: EventSubscriber): void {
    this.subscribers.push(subscriber);
  }

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    for (const subscriber of this.subscribers) {
      await subscriber(event as DomainEvent<unknown>);
    }
  }
}
