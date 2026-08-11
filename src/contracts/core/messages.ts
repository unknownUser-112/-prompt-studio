export interface Command<TPayload, TResult> {
  readonly type: string;
  readonly payload: Readonly<TPayload>;
}

export interface Query<TPayload, TResult> {
  readonly type: string;
  readonly payload: Readonly<TPayload>;
}

export interface DomainEvent<TPayload> {
  readonly type: string;
  readonly occurredAt: string;
  readonly payload: Readonly<TPayload>;
}
