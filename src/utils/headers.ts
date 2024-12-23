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
  storeClientType,
} from "../types";

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
  const resetTime = Math.abs(Math.ceil((expires - requestTime) / 1000))
    .toString()
    .toString();

  if (standardHeaders) {
    legacyHeaders = false;
    res.setHeader("RateLimit-Policy", `${limit};w=${window}`);

    if (standardHeaders === "draft-6") {
      res.setHeader("RateLimit-Limit", limitValue);
      res.setHeader("RateLimit-Remaining", remainingValue);
      res.setHeader("RateLimit-Reset", resetTime);
    }

    if (standardHeaders === "draft-7") {
      res.setHeader("limit", limitValue);
      res.setHeader("remaining", remainingValue);
      res.setHeader("reset", resetTime);
    }

    return;
  }

  if (legacyHeaders) {
    res.setHeader("X-RateLimit-Limit", limitValue);
    res.setHeader("X-RateLimit-Remaining", remainingValue);
    res.setHeader("X-RateLimit-Reset", resetTime);
  }
};

export const setRateLimitHeadersData = async (
  limitOptions: (request?: Request) => RateLimitOptions,
  request: Request,
  response: Response,
  key: ((req: Request, res: Response) => string) | undefined,
  clientStore: Map<string, RateLimitData> | storeClientType
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
  let rateLimitData: RateLimitData | undefined;

  if (clientStore instanceof Map) {
    rateLimitData = clientStore.get(identifierKey);
  } else {
    const rateLimitDataString = await clientStore.get(identifierKey);
    rateLimitData = rateLimitDataString
      ? (JSON.parse(rateLimitDataString as string) as RateLimitData)
      : undefined;
  }

  return {
    max,
    window,
    requestTime,
    identifierKey,
    rateData: rateLimitData,
  };
};
