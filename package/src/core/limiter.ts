import { Request, Response } from "express";
import {
  DEFAULT_RATE_LIMIT_HEADERS_TYPE,
  DEFAULT_SKIP_FAILED_REQUESTS,
  DEFAULT_STATUS_CODE,
} from "../lib/constants";
import { Logger } from "./logger";
import {
  HeaderConstructorFunction,
  HeadersType,
  limiterOptions,
  LoggerClass,
  Store,
} from "../lib/types";
import { FastifyReply, FastifyRequest } from "fastify";
import { createStore, extractIncomingRequestData, setHeaders } from "../utils";

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
   * @type {LoggerClass | undefined}
   * Logger instance for logging rate-limiting events.
   */
  private logger?: LoggerClass;

  private headerConstructor: HeaderConstructorFunction;

  /**
   * Initializes a new instance of the RateLimiterMiddleware.
   * @param {limiterOptions} options - Configuration options for the rate limiter.
   */
  constructor(
    options: limiterOptions,
    headerConstructor: HeaderConstructorFunction
  ) {
    this.options = {
      skipFailedRequests: DEFAULT_SKIP_FAILED_REQUESTS,
      statusCode: DEFAULT_STATUS_CODE,
      headersType: DEFAULT_RATE_LIMIT_HEADERS_TYPE,
      storeType: "memory",
      ...options,
    };

    this.store = createStore(
      options.storeType || "memory",
      options.externalStore,
      options.skip
    );
    this.headerConstructor = headerConstructor;

    if (this.options.logs) {
      this.logger = new Logger(this.options.logs.directory);
      this.logger.createDirectoryIfDoesNotExist(this.options.logs.directory);
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
      await extractIncomingRequestData(
        this.options.limitOptions,
        request,
        this.options.key,
        this.store
      );

    if (this.store.skip && this.store.skip.includes(identifierKey)) {
      return { shouldBlock: false, identifierKey };
    }

    setHeaders(
      {
        res: response,
        limit: max,
        requests: rateData?.requests || 1,
        expires: rateData?.expires || requestTime + window * 1000,
        window,
        requestTime,
      },
      this.headerConstructor
    );

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
