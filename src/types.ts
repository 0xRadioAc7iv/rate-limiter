import { Request, Response } from "express";
import { RedisClientType } from "redis";

export interface LoggerClass {
  directory: string;
  log: (request: Request) => Promise<void>;
  createDirectoryIfDoesNotExist: (directory: string) => Promise<void>;
}

export interface Store {
  limit: number;
  window: number;
  skip?: Array<string>;

  set: (key: string, value: RateLimitDataType) => void;
  get: (key: string) => Promise<RateLimitDataType | undefined>;

  modifyResponse: (
    response: Response,
    identifierKey: string,
    skipFailedRequests: boolean
  ) => Response;

  checkAndSetRateLimitData: (
    max: number,
    window: number,
    requestTime: number,
    identifierKey: string,
    rateData: RateLimitDataType | undefined,
    message: string | undefined,
    statusCode: number,
    headersType: HeadersType,
    response: Response
  ) => true | void | Promise<true | void>;
}

export type StoreType = "memory" | "redis";

export type logsOptions = {
  directory: string;
};

export type RateLimitOptions = {
  max: number;
  window: number;
};

export type RateLimitDataType = {
  requests: number;
  expires: number;
};

export type HeadersType = "legacy" | "draft-6" | "draft-7";

export type HeadersArgs = {
  res: Response;
  headersType: HeadersType;
  limit: number;
  requests: number;
  expires: number;
  window: number;
  requestTime: number;
};

export type limiterOptions = {
  key?: (request: Request) => string;
  skip?: Array<string>;
  skipFailedRequests?: boolean;
  message?: string;
  statusCode?: number;
  headersType: HeadersType;
  logs?: logsOptions;
  limitOptions: (request?: Request) => RateLimitOptions;
  storeType?: StoreType;
  redisStore?: RedisClientType;
};
