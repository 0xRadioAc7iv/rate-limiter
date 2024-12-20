import { RequestHandler } from "express";

import { limiterOptions, RateLimitData } from "./lib/types";
import {
  DEFAULT_RATE_LIMIT,
  DEFAULT_RATE_WINDOW,
  DEFAULT_CLEANUP_INTERVAL,
  DEFAULT_STATUS_CODE,
  DEFAULT_SKIP_FAILED_REQUESTS,
  DEFAULT_KEY_SKIP_LIST,
} from "./lib/constants";

const rates = new Map<string, RateLimitData>();

export const rateLimiter = ({
  key,
  skip = DEFAULT_KEY_SKIP_LIST,
  skipFailedRequests = DEFAULT_SKIP_FAILED_REQUESTS,
  limit = DEFAULT_RATE_LIMIT,
  window = DEFAULT_RATE_WINDOW,
  cleanUpInterval = DEFAULT_CLEANUP_INTERVAL,
  message,
  statusCode = DEFAULT_STATUS_CODE,
}: limiterOptions): RequestHandler => {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, rateData] of rates) {
      if (rateData.requests == 0 || now > rateData.expires) {
        rates.delete(ip);
      }
    }
  }, 1000 * cleanUpInterval);

  return (request, response, next) => {
    const requestTime = Date.now();
    const identifierKey = key ? key(request, response) : (request.ip as string);
    const rateData = rates.get(identifierKey);

    if (skip.includes(identifierKey)) return next();

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
        if (rateData.requests > limit - 1) {
          const timeLeft = Math.ceil((rateData.expires - requestTime) / 1000);

          response.setHeader("Retry-After", timeLeft);
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
    });

    next();
  };
};
