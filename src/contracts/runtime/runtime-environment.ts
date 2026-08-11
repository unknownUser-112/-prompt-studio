import type {
  Clock,
  HashProvider,
  IdGenerator,
  MonotonicClock,
  RandomSource,
} from "./providers";

export interface RuntimeEnvironment {
  readonly clock: Clock;
  readonly monotonicClock: MonotonicClock;
  readonly idGenerator: IdGenerator;
  readonly hashProvider: HashProvider;
  readonly randomSource: RandomSource;
  readonly locale: string;
  readonly timeZone: string;
}
