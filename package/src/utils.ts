import {
  HeaderConstructorFunction,
  HeadersArgs,
  HeadersType,
  RateLimitOptions,
  RequestTypes,
  Store,
  StoreType,
} from "./lib/types";
import { RedisClientType } from "redis";
import { Db } from "mongodb";
import { MemoryStore, MongoStore, RedisStore } from "./core/store";
import { DEFAULT_RATE_LIMIT, DEFAULT_RATE_WINDOW } from "./lib/constants";

/**
 * Computes stringified rate limiter values from internal numeric counters.
 *
 * @param {number} limit - Maximum number of allowed requests.
 * @param {number} requests - Number of requests made so far.
 * @param {number} expires - Time when the rate limit window expires (in ms).
 * @param {number} requestTime - Timestamp of the current request (in ms).
 * @returns {{ limitValue: string, remainingValue: string, resetTime: string }} Computed header values.
 */
const computeLimiterValues = (
  limit: number,
  requests: number,
  expires: number,
  requestTime: number
) => {
  const limitValue = limit.toString();
  const remainingValue = (limit - requests).toString();
  const resetTime = Math.abs(
    Math.ceil((expires - requestTime) / 1000)
  ).toString();

  return { limitValue, remainingValue, resetTime };
};

/**
 * Creates and returns the appropriate rate-limiting store instance based on the type.
 *
 * @param {StoreType} [storeType] - Type of backing store ("memory", "redis", "mongodb").
 * @param {RedisClientType | Db} [externalStore] - External Redis or MongoDB client.
 * @param {string[]} [skip] - Optional array of keys to skip in memory store.
 * @returns {Store} Store instance implementing rate limit logic.
 * @throws Will throw an error if the store type is redis or mongodb and the corresponding external store is not provided.
 */
export const createStore = (
  storeType?: StoreType,
  externalStore?: RedisClientType | Db,
  skip?: string[]
): Store => {
  if (storeType === "redis") {
    if (!externalStore || !("get" in externalStore))
      throw new Error("Configured Redis as Store but no Redis Store provided.");

    return new RedisStore(
      DEFAULT_RATE_LIMIT,
      DEFAULT_RATE_WINDOW,
      externalStore
    );
  } else if (storeType === "mongodb") {
    if (!externalStore || !("collection" in externalStore))
      throw new Error("Configured Mongo as Store but no Mongo Store provided.");

    return new MongoStore(
      DEFAULT_RATE_LIMIT,
      DEFAULT_RATE_WINDOW,
      externalStore
    );
  } else {
    return new MemoryStore(DEFAULT_RATE_LIMIT, DEFAULT_RATE_WINDOW, skip);
  }
};

/**
 * Extracts relevant information from an incoming request for rate limiting evaluation.
 *
 * @param {(request?: RequestTypes) => RateLimitOptions} limitOptions - Function to determine rate limit options dynamically.
 * @param {RequestTypes} request - The incoming request object.
 * @param {(req: RequestTypes) => string} [key] - Optional custom function to generate a unique identifier key.
 * @param {Store} store - The backing rate limiter store instance.
 * @returns {Promise<{
 *   max: number,
 *   window: number,
 *   requestTime: number,
 *   identifierKey: string,
 *   rateData: Awaited<ReturnType<Store["get"]>>
 * }>} Extracted request rate limiting context.
 */
export const extractIncomingRequestData = async (
  limitOptions: (request?: RequestTypes) => RateLimitOptions,
  request: RequestTypes,
  key: ((req: RequestTypes) => string) | undefined,
  store: Store
) => {
  const { max, window } = limitOptions(request);
  const requestTime = Date.now();
  const identifierKey = key ? key(request) : (request.ip as string);
  const rateData = await store.get(identifierKey);

  return {
    max,
    window,
    requestTime,
    identifierKey,
    rateData,
  };
};

/**
 * Creates a function that generates rate limit headers based on the specified header draft/version.
 *
 * @param {HeadersType} headersType - The desired header format (e.g., "draft-6", "draft-7", "draft-8", or "legacy").
 * @returns {HeaderConstructorFunction} Function to construct response headers.
 */
export const createHeaderConstructor = (
  headersType: HeadersType
): HeaderConstructorFunction => {
  if (headersType === "draft-6") {
    return (
      limit: string,
      remaining: string,
      reset: string,
      window: number
    ): Record<string, string> => {
      return {
        "RateLimit-Limit": limit,
        "RateLimit-Remaining": remaining,
        "RateLimit-Reset": reset,
        "RateLimit-Policy": `${limit};w=${window}`,
      };
    };
  }

  if (headersType === "draft-7") {
    return (
      limit: string,
      remaining: string,
      reset: string,
      window: number
    ): Record<string, string> => {
      return {
        limit: limit,
        remaining: remaining,
        reset: reset,
        "RateLimit-Policy": `${limit};w=${window}`,
      };
    };
  }

  if (headersType === "draft-8") {
    return (
      limit: string,
      remaining: string,
      reset: string,
      window: number
    ): Record<string, string> => {
      return {
        RateLimit: `${limit}, ${remaining}, ${reset}`,
        "RateLimit-Policy": `${limit};w=${window}`,
      };
    };
  }

  return (
    limit: string,
    remaining: string,
    reset: string,
    /* eslint-disable @typescript-eslint/no-unused-vars */
    _
  ): Record<string, string> => {
    return {
      "X-RateLimit-Limit": limit,
      "X-RateLimit-Remaining": remaining,
      "X-RateLimit-Reset": reset,
    };
  };
};

/**
 * Sets the appropriate rate limit headers on the response based on limiter state and chosen header format.
 *
 * @param {HeadersArgs} args - Arguments required to compute headers (response, limits, timestamps).
 * @param {HeaderConstructorFunction} headerConstructor - Function used to generate headers.
 */
export const setHeaders = (
  { res, limit, requests, expires, window, requestTime }: HeadersArgs,
  headerConstructor: HeaderConstructorFunction
) => {
  const { limitValue, remainingValue, resetTime } = computeLimiterValues(
    limit,
    requests,
    expires,
    requestTime
  );

  const headers = headerConstructor(
    limitValue,
    remainingValue,
    resetTime,
    window
  );

  if ("setHeaders" in res) {
    res.set(headers);
  } else {
    res.headers(headers);
  }
};
