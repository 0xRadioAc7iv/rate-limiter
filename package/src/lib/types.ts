import { Request, Response } from "express";
import { FastifyReply, FastifyRequest } from "fastify";
import { Db } from "mongodb";
import { RedisClientType } from "redis";

/**
 * @interface LoggerClass
 * @description Defines the structure for the logging class.
 */
export interface LoggerClass {
  directory: string;
  log: (
    request: Request | FastifyRequest,
    reply?: FastifyReply
  ) => Promise<void>;
  createDirectoryIfDoesNotExist: (directory: string) => Promise<void>;
}

/**
 * @interface Store
 * @description Defines the store used for rate limiting.
 */
export interface Store {
  limit: number;
  window: number;
  skip?: Array<string>;

  set: (key: string, value: RateLimitDataType) => Promise<void>;
  get: (key: string) => Promise<RateLimitDataType | undefined>;

  checkAndSetRateLimitData: (
    max: number,
    window: number,
    requestTime: number,
    identifierKey: string,
    rateData: RateLimitDataType | undefined,
    message: string | undefined,
    statusCode: number,
    headersType: HeadersType,
    response: Response | FastifyReply
  ) => Promise<true | void>;
}

/**
 * @typedef {"memory" | "redis" | "mongodb"} StoreType
 * @description The type of store used for rate limiting.
 */
export type StoreType = "memory" | "redis" | "mongodb";

/**
 * @typedef StoreClassType
 * @description The type of store class used for rate limiting.
 * @type {Map<string, RateLimitDataType> | RedisClientType | Db}
 */
export type StoreClassType =
  | Map<string, RateLimitDataType>
  | RedisClientType
  | Db;

/**
 * @typedef logsOptions
 * @property {string} directory - The directory where logs are stored.
 */
export type logsOptions = {
  directory: string;
};

/**
 * @typedef RateLimitOptions
 * @property {number} max - The maximum allowed requests.
 * @property {number} window - The time window in seconds.
 */
export type RateLimitOptions = {
  max: number;
  window: number;
};

/**
 * @typedef RateLimitDataType
 * @property {number} requests - The number of requests made.
 * @property {number} expires - The timestamp when the limit resets.
 */
export type RateLimitDataType = {
  requests: number;
  expires: number;
};

/**
 * @typedef {"legacy" | "draft-6" | "draft-7" | "draft-8"} HeadersType
 * @description The type of headers used for rate limiting.
 */
export type HeadersType = "legacy" | "draft-6" | "draft-7" | "draft-8";

/**
 * @typedef HeadersArgs
 * @property {Response} res - The response object.
 * @property {HeadersType} headersType - The type of headers.
 * @property {number} limit - The request limit.
 * @property {number} requests - The current number of requests.
 * @property {number} expires - The expiration time.
 * @property {number} window - The time window.
 * @property {number} requestTime - The request timestamp.
 */
export type HeadersArgs = {
  res: Response | FastifyReply;
  headersType: HeadersType;
  limit: number;
  requests: number;
  expires: number;
  window: number;
  requestTime: number;
};

/**
 * @typedef limiterOptions
 * @property {(request: Request) => string} [key] - A function to determine the key for rate limiting.
 * @property {Array<string>} [skip] - Requests to skip from rate limiting.
 * @property {boolean} [skipFailedRequests] - Whether to skip failed requests.
 * @property {string} [message] - The response message for rate-limited requests.
 * @property {number} [statusCode] - The status code for rate-limited responses.
 * @property {HeadersType} headersType - The type of headers to use.
 * @property {logsOptions} [logs] - Logging options.
 * @property {(request?: Request) => RateLimitOptions} limitOptions - Function to determine rate limit options.
 * @property {StoreType} [storeType] - The type of storage.
 * @property {RedisClientType | Db} [externalStore] - Store client instance.
 */
export type limiterOptions = {
  key?: (request: Request | FastifyRequest) => string;
  skip?: Array<string>;
  skipFailedRequests?: boolean;
  message?: string;
  statusCode?: number;
  headersType?: HeadersType;
  logs?: logsOptions;
  limitOptions: (request?: Request | FastifyRequest) => RateLimitOptions;
  storeType?: StoreType;
  externalStore?: RedisClientType | Db;
};
