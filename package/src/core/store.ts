import { RedisClientType } from "redis";
import { Response } from "express";
import {
  HeadersType,
  RateLimitDataType,
  Store,
  StoreClassType,
} from "../lib/types";
import { Db } from "mongodb";
import { FastifyReply } from "fastify";

abstract class BaseStore implements Store {
  limit: number;
  window: number;
  skip?: string[] | undefined;
  abstract store: StoreClassType;

  /**
   * Creates a new MemoryStore instance.
   * @param {number} limit - Maximum requests allowed.
   * @param {number} window - Time window in seconds.
   * @param {Array<string>} [skip] - Optional list of keys to skip rate limiting.
   */
  constructor(limit: number, window: number, skip?: Array<string>) {
    this.limit = limit;
    this.window = window;
    this.skip = skip || [];
  }

  /**
   * Retrieves rate limit data for a given key.
   * @param {string} key - The identifier key.
   * @returns {Promise<RateLimitDataType | undefined>} The rate limit data.
   */
  abstract get(key: string): Promise<RateLimitDataType | undefined>;

  /**
   * Sets a key-value pair in the store.
   * @param {string} key - The identifier key.
   * @param {RateLimitDataType} value - The rate limit data.
   */
  abstract set(key: string, value: RateLimitDataType): Promise<void>;

  /**
   * Checks and updates rate limit data before processing a request.
   * @param {number} max - Maximum allowed requests.
   * @param {number} window - Time window in seconds.
   * @param {number} requestTime - Current request timestamp.
   * @param {string} identifierKey - The key identifying the request source.
   * @param {RateLimitDataType | undefined} rateData - Existing rate limit data.
   * @param {string | undefined} message - Custom error message.
   * @param {number} statusCode - Status code for rate limit exceeded response.
   * @param {HeadersType} headersType - Type of headers to use.
   * @param {Response} response - Express response object.
   * @returns {true | void | Promise<true | void>} Whether the request was rate-limited.
   */
  async checkAndSetRateLimitData(
    max: number,
    window: number,
    requestTime: number,
    identifierKey: string,
    rateData: RateLimitDataType | undefined,
    message: string | undefined,
    statusCode: number,
    headersType: HeadersType,
    response: Response | FastifyReply
  ): Promise<true | void> {
    const firstRequestData = {
      requests: 1,
      expires: requestTime + window * 1000,
    };

    if (!rateData) {
      await this.set(identifierKey, firstRequestData);
    } else {
      if (requestTime >= rateData.expires) {
        await this.set(identifierKey, firstRequestData);
      } else {
        if (rateData.requests > max - 1) {
          const timeLeft = Math.ceil((rateData.expires - requestTime) / 1000);

          if (headersType === "legacy") {
            if ("setHeader" in response) {
              response.setHeader("Retry-After", timeLeft);
            } else {
              response.header("Retry-After", timeLeft);
            }
          }

          if ("hijack" in response) {
            response.status(statusCode).send({
              error: message
                ? message
                : `Rate limit exceeded. Try again in ${timeLeft} seconds.`,
            });
          } else {
            response.status(statusCode).json({
              error: message
                ? message
                : `Rate limit exceeded. Try again in ${timeLeft} seconds.`,
            });
          }

          return true;
        }

        await this.set(identifierKey, {
          ...rateData,
          requests: rateData.requests + 1,
        });
      }
    }
  }
}

/**
 * In-memory store for rate limiting.
 */
export class MemoryStore extends BaseStore {
  store: Map<string, RateLimitDataType>;
  interval!: NodeJS.Timeout;

  constructor(limit: number, window: number, skip?: Array<string>) {
    super(limit, window, skip);
    this.store = new Map<string, RateLimitDataType>();
    this.startCleanupInterval();
  }

  /**
   * Starts an interval to clean up expired rate limit entries.
   */
  private startCleanupInterval() {
    const cleanup = () => {
      const now = Date.now();
      let minRemainingTime = Infinity;

      for (const [ip, rateData] of this.store) {
        if (rateData.requests === 0 || now >= rateData.expires) {
          this.store.delete(ip);
        } else {
          const remainingTime = rateData.expires - now;
          minRemainingTime = Math.min(minRemainingTime, remainingTime);
        }
      }

      const nextInterval =
        minRemainingTime > 0 ? minRemainingTime : this.window * 1000;
      if (this.interval) {
        clearInterval(this.interval);
      }

      this.interval = setTimeout(cleanup, nextInterval);
    };

    cleanup();
  }

  async set(key: string, value: RateLimitDataType) {
    this.store.set(key, value);
  }

  async get(key: string): Promise<RateLimitDataType | undefined> {
    return this.store.get(key);
  }
}

/**
 * Redis-based store for rate limiting.
 */
export class RedisStore extends BaseStore {
  store: RedisClientType;

  constructor(
    limit: number,
    window: number,
    store: RedisClientType,
    skip?: Array<string>
  ) {
    super(limit, window, skip);
    this.store = store;
  }

  async set(key: string, value: RateLimitDataType) {
    await this.store.set(key, JSON.stringify(value), {
      EX: this.window,
    });
  }

  async get(key: string): Promise<RateLimitDataType | undefined> {
    const data = await this.store.get(key);
    return data ? (JSON.parse(data) as RateLimitDataType) : undefined;
  }
}

/**
 * MongoDB-based store for rate limiting.
 */
export class MongoStore extends BaseStore {
  store: Db;

  constructor(limit: number, window: number, store: Db, skip?: Array<string>) {
    super(limit, window, skip);
    this.store = store;
  }

  async set(key: string, value: RateLimitDataType) {
    await this.store
      .collection("rate-limits")
      .updateOne({ key }, { $set: { ...value } }, { upsert: true });
  }

  async get(key: string): Promise<RateLimitDataType | undefined> {
    const data = await this.store.collection("rate-limits").findOne({ key });
    return data
      ? { requests: data.requests as number, expires: data.expires as number }
      : undefined;
  }
}
