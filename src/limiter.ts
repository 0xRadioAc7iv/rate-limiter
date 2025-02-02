import { RequestHandler } from "express";
import { limiterOptions, Store } from "./types";
import {
  DEFAULT_STATUS_CODE,
  DEFAULT_SKIP_FAILED_REQUESTS,
  DEFAULT_RATE_LIMIT,
  DEFAULT_RATE_WINDOW,
} from "./constants";
import { MemoryStore, RedisStore } from "./store";
import { LoggerClass } from "./types";
import { Logger } from "./logger";
import { Headers } from "./headers";

export const rateLimiter = ({
  key,
  skip,
  skipFailedRequests = DEFAULT_SKIP_FAILED_REQUESTS,
  message,
  statusCode = DEFAULT_STATUS_CODE,
  headersType,
  logs,
  limitOptions,
  storeType = "memory",
  redisStore,
}: limiterOptions): RequestHandler => {
  let store: Store;
  let logger: LoggerClass | undefined;

  if (storeType === "memory") {
    store = new MemoryStore(DEFAULT_RATE_LIMIT, DEFAULT_RATE_WINDOW, skip);
  } else {
    if (!redisStore)
      throw new Error("Configured Redis as Store but no Redis Store provided.");

    store = new RedisStore(DEFAULT_RATE_LIMIT, DEFAULT_RATE_WINDOW, redisStore);
  }

  const headers = new Headers(headersType);

  if (logs) {
    logger = new Logger(logs.directory);
    logger.createDirectoryIfDoesNotExist(logs.directory);
  }

  const middleware: RequestHandler = async (request, response, next) => {
    const { max, window, requestTime, identifierKey, rateData } =
      await headers.setHeadersData(limitOptions, request, key, store);

    if (store.skip && store.skip.includes(identifierKey)) return next();

    headers.setHeaders({
      res: response,
      headersType,
      limit: max,
      requests: rateData?.requests || 1,
      expires: rateData?.expires || requestTime + window * 1000,
      window,
      requestTime,
    });

    const shouldReturn = await store.checkAndSetRateLimitData(
      max,
      window,
      requestTime,
      identifierKey,
      rateData,
      message,
      statusCode,
      headersType,
      response
    );

    if (logger) logger.log(request);

    if (shouldReturn) return;

    response = store.modifyResponse(
      response,
      identifierKey,
      skipFailedRequests
    );

    next();
  };

  return middleware;
};
