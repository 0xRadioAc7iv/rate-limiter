import { Request, Response } from "express";
import {
  DEFAULT_LEGACY_HEADERS,
  DEFAULT_RATE_LIMIT,
  DEFAULT_RATE_WINDOW,
} from "../lib/constants";
import {
  RateLimitData,
  RateLimitHeadersArgs,
  RateLimitOptions,
  standardHeadersType,
  storeClientType,
} from "../types";
import { RedisClientType } from "redis";
import { getRateLimitData } from "./store";

export const setRateLimitHeaders = ({
  res,
  legacyHeaders = DEFAULT_LEGACY_HEADERS,
  standardHeaders,
  limit,
  requests,
  expires,
  window,
  requestTime,
}: RateLimitHeadersArgs) => {
  const limitValue = limit.toString();
  const remainingValue = (limit - requests).toString();
  const resetTime = Math.abs(
    Math.ceil((expires - requestTime) / 1000)
  ).toString();

  if (standardHeaders) {
    const headers = constructHeaders(
      standardHeaders,
      limitValue,
      remainingValue,
      resetTime
    );

    res.setHeader("RateLimit-Policy", `${limit};w=${window}`);
    res.setHeaders(headers);
    return;
  }

  if (legacyHeaders) {
    const headers = constructHeaders(
      "legacy",
      limitValue,
      remainingValue,
      resetTime
    );
    res.setHeaders(headers);
  }
};

export const setRateLimitHeadersData = async (
  limitOptions: (request?: Request) => RateLimitOptions,
  request: Request,
  response: Response,
  key: ((req: Request, res: Response) => string) | undefined,
  clientStore: storeClientType
): Promise<{
  max: number;
  window: number;
  requestTime: number;
  identifierKey: string;
  rateData: RateLimitData | undefined;
}> => {
  const { max, window } = limitOptions
    ? limitOptions(request)
    : { max: DEFAULT_RATE_LIMIT, window: DEFAULT_RATE_WINDOW };
  const requestTime = Date.now();
  const identifierKey = key ? key(request, response) : (request.ip as string);
  const rateData = await getRateLimitData(clientStore, identifierKey);

  return {
    max,
    window,
    requestTime,
    identifierKey,
    rateData,
  };
};

const constructHeaders = (
  headersType: standardHeadersType | "legacy",
  limit: string,
  remaining: string,
  reset: string
) => {
  const headers = new Map<string, string>([]);

  if (headersType === "draft-6") {
    headers.set("RateLimit-Limit", limit);
    headers.set("RateLimit-Remaining", remaining);
    headers.set("RateLimit-Reset", reset);
  } else if (headersType === "draft-7") {
    headers.set("limit", limit);
    headers.set("remaining", remaining);
    headers.set("reset", reset);
  } else {
    headers.set("X-RateLimit-Limit", limit);
    headers.set("X-RateLimit-Remaining", remaining);
    headers.set("X-RateLimit-Reset", reset);
  }

  return headers;
};
