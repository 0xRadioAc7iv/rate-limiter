import { RequestHandler } from "express";
import { limiterOptions } from "../lib/types";
import { RateLimiterMiddleware } from "../core/limiter";

/**
 * Express middleware for rate limiting.
 * @param {limiterOptions} options - Configuration options for rate limiting.
 * @returns {RequestHandler} Express middleware function.
 */
export const expressRateLimiter = (options: limiterOptions): RequestHandler => {
  const limiter = new RateLimiterMiddleware(options);

  /**
   * Rate limiter middleware function.
   */
  return async (request, response, next) => {
    try {
      const { shouldBlock, identifierKey } = await limiter.processRequest(
        request,
        response
      );

      if (shouldBlock) return;

      /* eslint-disable */
      const originalEnd = response.end;
      response.end = function (
        this: typeof response,
        chunk?: any,
        encodingOrCallback?: string | (() => void),
        callback?: () => void
      ) {
        limiter.handleResponse(identifierKey, response.statusCode);
        return originalEnd.apply(this, arguments as any);
      };
      /* eslint-enable */

      next();
    } catch (error) {
      next(error);
    }
  };
};
