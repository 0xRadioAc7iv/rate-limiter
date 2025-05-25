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

export const createStore = (
  storeType?: StoreType,
  externalStore?: RedisClientType | Db,
  skip?: string[]
) => {
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
    _
  ): Record<string, string> => {
    return {
      "X-RateLimit-Limit": limit,
      "X-RateLimit-Remaining": remaining,
      "X-RateLimit-Reset": reset,
    };
  };
};

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
