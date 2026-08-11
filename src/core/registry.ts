import type { Command, Query } from "../contracts/core/messages";

type Awaitable<T> = T | Promise<T>;

export interface CommandHandler<TPayload = unknown, TResult = unknown> {
  readonly type: string;
  handle(command: Command<TPayload, TResult>): Awaitable<TResult>;
}

export interface QueryHandler<TPayload = unknown, TResult = unknown> {
  readonly type: string;
  handle(query: Query<TPayload, TResult>): Awaitable<TResult>;
}

export class HandlerRegistry {
  private readonly commandHandlers = new Map<string, CommandHandler>();
  private readonly queryHandlers = new Map<string, QueryHandler>();

  registerCommand<TPayload, TResult>(handler: CommandHandler<TPayload, TResult>): void {
    if (this.commandHandlers.has(handler.type)) {
      throw new Error(`Duplicate command handler: ${handler.type}`);
    }

    this.commandHandlers.set(handler.type, handler as CommandHandler);
  }

  registerQuery<TPayload, TResult>(handler: QueryHandler<TPayload, TResult>): void {
    if (this.queryHandlers.has(handler.type)) {
      throw new Error(`Duplicate query handler: ${handler.type}`);
    }

    this.queryHandlers.set(handler.type, handler as QueryHandler);
  }

  commandFor<TPayload, TResult>(
    type: string,
  ): CommandHandler<TPayload, TResult> | undefined {
    return this.commandHandlers.get(type) as
      | CommandHandler<TPayload, TResult>
      | undefined;
  }

  queryFor<TPayload, TResult>(
    type: string,
  ): QueryHandler<TPayload, TResult> | undefined {
    return this.queryHandlers.get(type) as QueryHandler<TPayload, TResult> | undefined;
  }
}
