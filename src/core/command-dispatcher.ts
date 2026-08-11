import type { Command } from "../contracts/core/messages";
import type { HandlerRegistry } from "./registry";

export class CommandDispatcher {
  constructor(private readonly registry: HandlerRegistry) {}

  async dispatch<TPayload, TResult>(command: Command<TPayload, TResult>): Promise<TResult> {
    const handler = this.registry.commandFor<TPayload, TResult>(command.type);
    if (handler === undefined) {
      throw new Error(`No command handler registered for: ${command.type}`);
    }

    return handler.handle(command);
  }
}
