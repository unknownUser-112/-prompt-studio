import type { Query } from "../contracts/core/messages";
import type { HandlerRegistry } from "./registry";

export class QueryDispatcher {
  constructor(private readonly registry: HandlerRegistry) {}

  async dispatch<TPayload, TResult>(query: Query<TPayload, TResult>): Promise<TResult> {
    const handler = this.registry.queryFor<TPayload, TResult>(query.type);
    if (handler === undefined) {
      throw new Error(`No query handler registered for: ${query.type}`);
    }

    return handler.handle(query);
  }
}
