import { RequestHandler } from "express";
import { limiterOptions } from "./types";
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
export declare const rateLimiter: ({ key, skip, skipFailedRequests, cleanUpInterval, message, statusCode, legacyHeaders, standardHeaders, logs, limitOptions, store, }: limiterOptions) => RequestHandler;
