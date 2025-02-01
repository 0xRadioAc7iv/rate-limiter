import { Request, Response } from "express";

export interface LoggerClass {
  logging?: boolean;
  log: (directory: string, request: Request) => Promise<void>;
  createDirectoryIfDoesNotExist: (directory: string) => Promise<void>;
}

export interface Store {
  limit?: number;
  window?: number;
  skip?: Array<string>;
  get: (key: string) => RateLimitDataType | undefined;
}

export type StoreType = "memory" | "redis";

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
