import { RequestHandler } from "express";
import { limiterOptions } from "../lib/types";
import { RateLimiterMiddleware } from "../core/limiter";
import { createHeaderConstructor } from "../utils";

/**
 * Express middleware for rate limiting.
 * @param {limiterOptions} options - Configuration options for rate limiting.
 * @returns {RequestHandler} Express middleware function.
 */
export const expressRateLimiter = (options: limiterOptions): RequestHandler => {
  const headerConstructor = createHeaderConstructor(
    options.headersType || "legacy"
  );
  const limiter = new RateLimiterMiddleware(options, headerConstructor);

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

      response.on("close", () =>
        limiter.handleResponse(identifierKey, response.statusCode)
      );

      next();
    } catch (error) {
      next(error);
    }
  };
};
