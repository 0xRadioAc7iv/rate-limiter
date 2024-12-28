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
import { getRateLimitData } from "./store";

/**
 * Sets the rate limit headers on the response based on the provided options.
 *
 * @param {RateLimitHeadersArgs} args - Arguments for setting the rate limit headers.
 * @property {Response} args.res - Express response object.
 * @property {boolean} [args.legacyHeaders=DEFAULT_LEGACY_HEADERS] - Whether to include legacy headers.
 * @property {standardHeadersType} [args.standardHeaders] - Standard headers version to use.
 * @property {number} args.limit - Maximum number of requests allowed.
 * @property {number} args.requests - Number of requests made so far.
 * @property {number} args.expires - Timestamp when the rate limit window expires.
 * @property {number} args.window - Length of the rate limit window (in seconds).
 * @property {number} args.requestTime - Timestamp of the current request.
 */
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

/**
 * Sets the rate limit headers data by fetching and calculating rate limit parameters.
 *
 * @param {(request?: Request) => RateLimitOptions} limitOptions - Function to retrieve rate limit options for the request.
 * @param {Request} request - Express request object.
 * @param {Response} response - Express response object.
 * @param {(req: Request, res: Response) => string} [key] - Function to generate a unique key for rate limiting.
 * @param {storeClientType} clientStore - Storage client for managing rate limit data.
 * @returns {Promise<{
 *   max: number;
 *   window: number;
 *   requestTime: number;
 *   identifierKey: string;
 *   rateData: RateLimitData | undefined;
 * }>} - Object containing rate limit data and associated parameters.
 */
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

/**
 * Constructs the rate limit headers based on the specified header type.
 *
 * @param {standardHeadersType | "legacy"} headersType - Type of headers to construct.
 * @param {string} limit - Maximum number of requests allowed.
 * @param {string} remaining - Number of remaining requests.
 * @param {string} reset - Time (in seconds) until the rate limit resets.
 * @returns {Map<string, string>} - Map of constructed headers.
 */
export const constructHeaders = (
  headersType: standardHeadersType | "legacy",
  limit: string,
  remaining: string,
  reset: string
): Map<string, string> => {
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
