import { RequestHandler } from "express";
import { limiterOptions } from "./types";
import {
  DEFAULT_CLEANUP_INTERVAL,
  DEFAULT_STATUS_CODE,
  DEFAULT_SKIP_FAILED_REQUESTS,
  DEFAULT_KEY_SKIP_LIST,
  DEFAULT_LEGACY_HEADERS,
} from "./lib/constants";
import { setRateLimitHeadersData, setRateLimitHeaders } from "./utils/headers";
import { createDirectoryIfNotExists } from "./utils/logs";
import {
  checkAndSetRateLimitData,
  modifyResponseIfNeededAndWriteLogs,
  setClientStore,
} from "./utils/store";

/**
 * Creates a rate-limiting middleware for Express.js.
 *
 * This middleware manages rate-limiting based on customizable parameters. It supports in-memory and custom stores,
 * logging, headers customization, skipping certain requests, and managing failed requests.
 *
 * @param {limiterOptions} options - The configuration options for the rate limiter.
 * @param {string} options.key - The unique key used to identify requests (e.g., IP address or custom key).
 * @param {string[]} [options.skip=DEFAULT_KEY_SKIP_LIST] - List of keys to skip from rate-limiting.
 * @param {boolean} [options.skipFailedRequests=DEFAULT_SKIP_FAILED_REQUESTS] - Whether to skip failed requests from rate limits.
 * @param {number} [options.cleanUpInterval=DEFAULT_CLEANUP_INTERVAL] - Interval (in seconds) to clean up expired rate-limiting data.
 * @param {string} [options.message] - Custom message to send when the rate limit is exceeded.
 * @param {number} [options.statusCode=DEFAULT_STATUS_CODE] - HTTP status code to send when the rate limit is exceeded.
 * @param {boolean} [options.legacyHeaders=DEFAULT_LEGACY_HEADERS] - Whether to include legacy rate-limiting headers.
 * @param {boolean} [options.standardHeaders] - Whether to include standard rate-limiting headers (e.g., `RateLimit-*`).
 * @param {object} [options.logs] - Configuration for logging requests.
 * @param {string} [options.logs.directory] - Directory path for storing log files.
 * @param {object[]} options.limitOptions - Options for rate-limiting (e.g., max requests, time window).
 * @param {object} [options.store] - Optional custom store to use for managing rate-limiting data.
 * @returns {RequestHandler} - The middleware function to be used in an Express app.
 */
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
  store,
}: limiterOptions): RequestHandler => {
  const clientStore = setClientStore(cleanUpInterval, store);
  if (logs) createDirectoryIfNotExists(logs.directory);

  const middleware: RequestHandler = async (request, response, next) => {
    const { max, window, requestTime, identifierKey, rateData } =
      await setRateLimitHeadersData(
        limitOptions,
        request,
        response,
        key,
        clientStore
      );

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

    const shouldReturn = await checkAndSetRateLimitData(
      max,
      window,
      requestTime,
      identifierKey,
      rateData,
      message,
      statusCode,
      legacyHeaders,
      response,
      clientStore
    );

    if (shouldReturn) return;

    response = modifyResponseIfNeededAndWriteLogs(
      request,
      response,
      logs,
      identifierKey,
      skipFailedRequests,
      clientStore
    );

    next();
  };

  return middleware;
};
