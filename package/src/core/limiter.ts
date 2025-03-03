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

export class RateLimiterMiddleware {
  private options: limiterOptions;
  private store: Store;
  private headers: Headers;
  private logger?: LoggerClass;

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
