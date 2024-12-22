import { RequestHandler } from "express";
import { limiterOptions, RateLimitData } from "./types";
import {
  DEFAULT_RATE_WINDOW,
  DEFAULT_CLEANUP_INTERVAL,
  DEFAULT_STATUS_CODE,
  DEFAULT_SKIP_FAILED_REQUESTS,
  DEFAULT_KEY_SKIP_LIST,
  DEFAULT_LEGACY_HEADERS,
  DEFAULT_RATE_LIMIT,
} from "./lib/constants";
import { setRateLimitHeaders } from "./utils/headers";
import { createDirectoryIfNotExists, writeLogs } from "./utils/logs";

const rates = new Map<string, RateLimitData>();

export const rateLimiter = ({
  key,
  skip = DEFAULT_KEY_SKIP_LIST,
  skipFailedRequests = DEFAULT_SKIP_FAILED_REQUESTS,
  cleanUpInterval = DEFAULT_CLEANUP_INTERVAL,
  message,
  statusCode = DEFAULT_STATUS_CODE,
  legacyHeaders = DEFAULT_LEGACY_HEADERS,
  standardHeaders,
  logs,
  limitOptions,
}: limiterOptions): RequestHandler => {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, rateData] of rates) {
      if (rateData.requests == 0 || now > rateData.expires) {
        rates.delete(ip);
      }
    }
  }, 1000 * cleanUpInterval);

  if (logs) createDirectoryIfNotExists(logs.directory);

  const { max, window } = limitOptions
    ? limitOptions()
    : { max: DEFAULT_RATE_LIMIT, window: DEFAULT_RATE_WINDOW };

  return (request, response, next) => {
    const requestTime = Date.now();
    const identifierKey = key ? key(request, response) : (request.ip as string);
    const rateData = rates.get(identifierKey);

    if (skip && skip.includes(identifierKey)) return next();

    setRateLimitHeaders({
      res: response,
      limit: max,
      requests: rateData?.requests || 1,
      expires: rateData?.expires || requestTime + window * 1000,
      legacyHeaders,
      standardHeaders,
      window,
      requestTime,
    });

    if (!rateData) {
      rates.set(identifierKey, {
        requests: 1,
        expires: requestTime + window * 1000,
      });
    } else {
      if (requestTime >= rateData.expires) {
        rates.set(identifierKey, {
          requests: 1,
          expires: requestTime + window * 1000,
        });
      } else {
        if (rateData.requests > max - 1) {
          const timeLeft = Math.ceil((rateData.expires - requestTime) / 1000);

          if (legacyHeaders) {
            response.setHeader("Retry-After", timeLeft);
          }

          response.status(statusCode).json({
            error: message
              ? message
              : `Rate limit exceeded. Try again in ${timeLeft} seconds.`,
          });

          return;
        }

        rates.set(identifierKey, {
          ...rateData,
          requests: rateData.requests + 1,
        });
      }
    }

    response.on("finish", () => {
      const rateData = rates.get(identifierKey) as RateLimitData;

      if (skipFailedRequests && response.statusCode >= 400) {
        rates.set(identifierKey, {
          ...rateData,
          requests: rateData.requests - 1,
        });
      }

      if (logs) writeLogs(logs.directory, request);
    });

    next();
  };
};
