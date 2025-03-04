import { Request, Response } from "express";
import {
  DEFAULT_RATE_LIMIT,
  DEFAULT_RATE_LIMIT_HEADERS_TYPE,
  DEFAULT_RATE_WINDOW,
  DEFAULT_SKIP_FAILED_REQUESTS,
  DEFAULT_STATUS_CODE,
} from "../lib/constants";
import { Headers } from "./headers";
import { Logger } from "./logger";
import { MemoryStore, MongoStore, RedisStore } from "./store";
import { HeadersType, limiterOptions, LoggerClass, Store } from "../lib/types";
import { FastifyReply, FastifyRequest } from "fastify";

/**
 * Core Rate Limiting Middleware Class
 */
export class RateLimiterMiddleware {
  /**
   * @private
   * @type {limiterOptions}
   * Options for rate limiting.
   */
  private options: limiterOptions;

  /**
   * @private
   * @type {Store}
   * Storage mechanism for tracking request counts.
   */
  private store: Store;

  /**
   * @private
   * @type {Headers}
   * Manages setting rate limit headers.
   */
  private headers: Headers;

  /**
   * @private
   * @type {LoggerClass | undefined}
   * Logger instance for logging rate-limiting events.
   */
  private logger?: LoggerClass;

  /**
   * Initializes a new instance of the RateLimiterMiddleware.
   * @param {limiterOptions} options - Configuration options for the rate limiter.
   */
  constructor(options: limiterOptions) {
    this.options = {
      skipFailedRequests: DEFAULT_SKIP_FAILED_REQUESTS,
      statusCode: DEFAULT_STATUS_CODE,
      headersType: DEFAULT_RATE_LIMIT_HEADERS_TYPE,
      storeType: "memory",
      ...options,
    };

    this.store = this.initializeStore();
    this.headers = new Headers(this.options.headersType as HeadersType);

    if (this.options.logs) {
      this.logger = new Logger(this.options.logs.directory);
      this.logger.createDirectoryIfDoesNotExist(this.options.logs.directory);
    }
  }

  /**
   * Initializes the appropriate store (Redis, MongoDB, or in-memory) for rate limiting.
   * @private
   * @returns {Store} - The initialized store instance.
   * @throws {Error} - If an external store is required but not provided.
   */
  private initializeStore(): Store {
    const { storeType, externalStore, skip } = this.options;

    if (storeType === "redis") {
      if (!externalStore || !("get" in externalStore))
        throw new Error(
          "Configured Redis as Store but no Redis Store provided."
        );

      return new RedisStore(
        DEFAULT_RATE_LIMIT,
        DEFAULT_RATE_WINDOW,
        externalStore
      );
    } else if (storeType === "mongodb") {
      if (!externalStore || !("collection" in externalStore))
        throw new Error(
          "Configured Mongo as Store but no Mongo Store provided."
        );

      return new MongoStore(
        DEFAULT_RATE_LIMIT,
        DEFAULT_RATE_WINDOW,
        externalStore
      );
    } else {
      return new MemoryStore(DEFAULT_RATE_LIMIT, DEFAULT_RATE_WINDOW, skip);
    }
  }

  /**
   * Processes an incoming request to determine if it should be rate limited.
   * @param {Request | FastifyRequest} request - The incoming request object.
   * @param {Response | FastifyReply} response - The outgoing response object.
   * @returns {Promise<{ shouldBlock: boolean | void; identifierKey: string; }>} - Rate limiting decision and identifier key.
   */
  async processRequest(
    request: Request | FastifyRequest,
    response: Response | FastifyReply
  ): Promise<{
    shouldBlock: boolean | void;
    identifierKey: string;
  }> {
    const { max, window, requestTime, identifierKey, rateData } =
      await this.headers.setHeadersData(
        this.options.limitOptions,
        request,
        this.options.key,
        this.store
      );

    if (this.store.skip && this.store.skip.includes(identifierKey)) {
      return { shouldBlock: false, identifierKey };
    }

    this.headers.setHeaders({
      res: response,
      headersType: this.options.headersType as HeadersType,
      limit: max,
      requests: rateData?.requests || 1,
      expires: rateData?.expires || requestTime + window * 1000,
      window,
      requestTime,
    });

    if (this.logger) this.logger.log(request);

    const shouldBlock = await this.store.checkAndSetRateLimitData(
      max,
      window,
      requestTime,
      identifierKey,
      rateData,
      this.options.message,
      this.options.statusCode as number,
      this.options.headersType as HeadersType,
      response
    );

    return { shouldBlock, identifierKey };
  }

  /**
   * Handles response processing, adjusting rate limit data if necessary for failed requests.
   * @param {string} identifierKey - Unique identifier for the rate-limited entity.
   * @param {number} statusCode - HTTP status code of the response.
   * @returns {Promise<void>} - Resolves when processing is complete.
   */
  async handleResponse(
    identifierKey: string,
    statusCode: number
  ): Promise<void> {
    if (this.options.skipFailedRequests && statusCode >= 400) {
      const rateLimitData = await this.store.get(identifierKey);
      if (rateLimitData) {
        await this.store.set(identifierKey, {
          expires: rateLimitData.expires as number,
          requests: (rateLimitData.requests as number) - 1,
        });
      }
    }
  }
}
