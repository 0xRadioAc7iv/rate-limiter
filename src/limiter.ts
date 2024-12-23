import { RequestHandler } from "express";
import { limiterOptions, RateLimitData } from "./types";
import {
  DEFAULT_CLEANUP_INTERVAL,
  DEFAULT_STATUS_CODE,
  DEFAULT_SKIP_FAILED_REQUESTS,
  DEFAULT_KEY_SKIP_LIST,
  DEFAULT_LEGACY_HEADERS,
} from "./lib/constants";
import { setRateLimitHeadersData, setRateLimitHeaders } from "./utils/headers";
import { createDirectoryIfNotExists, writeLogs } from "./utils/logs";
import {
  checkAndSetRateLimitData,
  modifyResponseIfNeededAndWriteLogs,
  setClientStore,
} from "./utils/store";

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

  return async (request, response, next) => {
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

    if (
      checkAndSetRateLimitData(
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
      )
    ) {
      return;
    }

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
};
