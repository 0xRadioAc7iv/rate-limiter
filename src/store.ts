import {
  DEFAULT_RATE_LIMIT,
  DEFAULT_RATE_LIMIT_LOGGING,
  DEFAULT_RATE_WINDOW,
} from "./constants";
import { RateLimitDataType, Store } from "./types";

export class MemoryStore implements Store {
  store: Map<string, RateLimitDataType>;
  limit?: number;
  window?: number;
  logging?: boolean;
  skip?: Array<string>;

  constructor(
    limit?: number,
    window?: number,
    logging?: boolean,
    skip?: Array<string>
  ) {
    this.store = new Map<string, RateLimitDataType>();
    this.limit = limit ? limit : DEFAULT_RATE_LIMIT;
    this.window = window ? window : DEFAULT_RATE_WINDOW;
    this.logging = logging ? logging : DEFAULT_RATE_LIMIT_LOGGING;
    this.skip = skip ? skip : [];
  }

  get(key: string) {
    return this.store.get(key);
  }

  createLoggingDirectory() {}

  log() {
    if (this.logging) {
    }
  }
}
