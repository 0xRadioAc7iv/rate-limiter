import { Request, Response } from "express";
import { RedisClientType } from "redis";

/**
 * @typedef {"draft-6" | "draft-7"} standardHeadersType
 * Specifies the version of standard RateLimit headers to use.
 */
export type standardHeadersType = "draft-6" | "draft-7";

/**
 * @typedef {Map<string, RateLimitData> | RedisClientType} storeClientType
 * Represents the type of storage client used for rate limiting. Can be an in-memory `Map` or a Redis client.
 */
export type storeClientType = Map<string, RateLimitData> | RedisClientType;

/**
 * @typedef {Object} storeType
 * @property {RedisClientType} client - The Redis client used for rate limiting.
 */
export type storeType = {
  client: RedisClientType;
};

/**
 * @typedef {Object} logsOptions
 * @property {string} directory - Directory to store logs.
 */
export type logsOptions = {
  directory: string;
};

/**
 * @typedef {Object} RateLimitOptions
 * @property {number} max - Maximum requests allowed per key in the specified window.
 * @property {number} window - Allowed number of requests within the window (in seconds).
 */
export type RateLimitOptions = {
  max: number;
  window: number;
};

/**
 * @typedef {Object} limiterOptions
 * @property {(request: Request, response: Response) => string} [key] - Function to generate a unique key for rate limiting.
 * @property {Array<string>} [skip] - Keys to exclude from rate limiting.
 * @property {boolean} [skipFailedRequests] - Whether to exclude failed requests from rate limiting. Defaults to `false`.
 * @property {string} [message] - Message to send when the rate limit is exceeded.
 * @property {number} [statusCode] - HTTP status code to return when the rate limit is exceeded. Defaults to `429`.
 * @property {number} [cleanUpInterval] - Interval (in seconds) to clean up expired rate limit data.
 * @property {boolean} [legacyHeaders] - Whether to include legacy `X-RateLimit-*` headers in the response.
 * @property {standardHeadersType} [standardHeaders] - Standard RateLimit headers version to use.
 * @property {logsOptions} [logs] - Logging configuration for the rate limiter.
 * @property {(request?: Request) => RateLimitOptions} limitOptions - Function to define rate limit options for each request.
 * @property {storeType} [store] - Storage configuration for rate limiting.
 */
export type limiterOptions = {
  key?: (request: Request, response: Response) => string;
  skip?: Array<string>;
  skipFailedRequests?: boolean;
  message?: string;
  statusCode?: number;
  cleanUpInterval?: number;
  legacyHeaders?: boolean;
  standardHeaders?: standardHeadersType;
  logs?: logsOptions;
  limitOptions: (request?: Request) => RateLimitOptions;
  store?: storeType;
};

/**
 * @typedef {Object} RateLimitData
 * @property {number} requests - Number of requests made during the current window.
 * @property {number} expires - Timestamp when the rate limit window expires.
 */
export type RateLimitData = {
  requests: number;
  expires: number;
};

/**
 * @typedef {Object} RateLimitHeadersArgs
 * @property {Response} res - Express response object.
 * @property {boolean} [legacyHeaders] - Whether to include legacy headers.
 * @property {standardHeadersType} [standardHeaders] - Standard headers version.
 * @property {number} limit - Maximum number of requests allowed.
 * @property {number} requests - Number of requests made so far.
 * @property {number} expires - Timestamp when the rate limit window expires.
 * @property {number} window - Length of the rate limit window (in seconds).
 * @property {number} requestTime - Timestamp of the current request.
 */
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
