import { Request, Response } from "express";
import { RedisClientType } from "redis";

export type standardHeadersType = "draft-6" | "draft-7";

export type storeClientType = RedisClientType;

export type storeType = {
  client: storeClientType;
};

export type logsOptions = {
  directory: string; // Directory to store logs
};

export type RateLimitOptions = {
  max: number; // Maximum Requests per key in the specified window
  window: number; // Allowed 'limit' number of requests in 'window' seconds.
};

export type limiterOptions = {
  key?: (request: Request, response: Response) => string; // Key to identify the rate limit
  skip?: Array<string>; // Skip rate limiting for these keys
  skipFailedRequests?: boolean; // Skip failed requests from rate limiting
  message?: string; // Message to send on hitting the Rate limit
  statusCode?: number; // Status code to send on hitting the Rate limit
  cleanUpInterval?: number; // Interval to cleanup the rate data
  legacyHeaders?: boolean; // Use X-RateLimit-* headers along with Retry-After
  standardHeaders?: standardHeadersType; // Use RateLimit-* headers
  logs?: logsOptions; // Enable logs
  limitOptions: (request?: Request) => RateLimitOptions;
  store?: storeType; // Store to use for rate limiting
};

export type RateLimitData = {
  requests: number;
  expires: number;
};

export type RateLimitHeadersArgs = {
  res: Response;
  legacyHeaders?: boolean;
  standardHeaders?: standardHeadersType;
  limit: number;
  requests: number;
  expires: number;
  window: number;
  requestTime: number;
};
