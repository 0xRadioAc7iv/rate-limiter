import { Request, Response } from "express";
import {
  logsOptions,
  RateLimitData,
  storeClientType,
  storeType,
} from "../types";
import { writeLogs } from "./logs";

/**
 * Sets the client store for rate-limiting, either using a provided store or a local in-memory store.
 *
 * @param {number} cleanUpInterval - Interval (in seconds) to clean up expired rate limit data.
 * @param {storeType} [store] - Optional store to use. If not provided, a local Map store is used.
 * @returns {storeClientType} - The store client to be used for rate-limiting.
 */
export const setClientStore = (
  cleanUpInterval: number,
  store?: storeType
): storeClientType => {
  if (!store) {
    const localStore = new Map<string, RateLimitData>();

    setInterval(() => {
      const now = Date.now();
      for (const [ip, rateData] of localStore) {
        if (rateData.requests == 0 || now > rateData.expires) {
          localStore.delete(ip);
        }
      }
    }, 1000 * cleanUpInterval);

    return localStore;
  }

  return store.client;
};

/**
 * Modifies the response if needed and writes logs based on request completion.
 *
 * @param {Request} request - The Express request object.
 * @param {Response} response - The Express response object.
 * @param {logsOptions} [logs] - Options for logging requests.
 * @param {string} identifierKey - Unique identifier for the rate-limiting key.
 * @param {boolean} skipFailedRequests - Whether to skip failed requests for rate-limiting.
 * @param {storeClientType} store - The store to manage rate-limiting data.
 * @returns {Response} - The modified response object.
 */
export const modifyResponseIfNeededAndWriteLogs = (
  request: Request,
  response: Response,
  logs: logsOptions | undefined,
  identifierKey: string,
  skipFailedRequests: boolean,
  store: storeClientType
): Response => {
  response.on("finish", async () => {
    await modifyResponse(store, identifierKey, skipFailedRequests, response);
    if (logs) writeLogs(logs.directory, request);
  });

  return response;
};

/**
 * Checks and sets rate-limiting data, enforcing limits if exceeded.
 *
 * @param {number} max - Maximum allowed requests.
 * @param {number} window - Time window in seconds for the rate limit.
 * @param {number} requestTime - Current request timestamp in milliseconds.
 * @param {string} identifierKey - Unique key for the rate limit data.
 * @param {RateLimitData} rateData - Existing rate limit data.
 * @param {string} [message] - Optional message to send when rate limit is exceeded.
 * @param {number} statusCode - HTTP status code to send when rate limit is exceeded.
 * @param {boolean} legacyHeaders - Whether to use legacy headers.
 * @param {Response} response - The Express response object.
 * @param {storeClientType} store - The store to manage rate-limiting data.
 * @returns {Promise<true | void>} - Returns `true` if the rate limit is exceeded, otherwise `void`.
 */
export const checkAndSetRateLimitData = async (
  max: number,
  window: number,
  requestTime: number,
  identifierKey: string,
  rateData: RateLimitData | undefined,
  message: string | undefined,
  statusCode: number,
  legacyHeaders: boolean,
  response: Response,
  store: storeClientType
): Promise<true | void> => {
  const firstRequestData = {
    requests: 1,
    expires: requestTime + window * 1000,
  };

  if (!rateData) {
    await setRateLimitData(store, identifierKey, firstRequestData);
  } else {
    if (requestTime >= rateData.expires) {
      await setRateLimitData(store, identifierKey, firstRequestData);
    } else {
      if (rateData.requests > max - 1) {
        const timeLeft = Math.ceil((rateData.expires - requestTime) / 1000);

        if (legacyHeaders) {
          response.setHeader("Retry-After", timeLeft);
        }

        response.status(statusCode).json({
          error: message
            ? message
            : `Rate limit exceeded. Try again in ${timeLeft} seconds.`,
        });

        return true;
      }

      await setRateLimitData(store, identifierKey, {
        ...rateData,
        requests: rateData.requests + 1,
      });
    }
  }
};

/**
 * Retrieves rate-limiting data for a specific identifier key from the store.
 *
 * @param {storeClientType} store - The store to retrieve rate limit data from.
 * @param {string} identifierKey - The unique key for the rate limit data.
 * @returns {Promise<RateLimitData | undefined>} - The rate limit data or `undefined` if not found.
 */
export const getRateLimitData = async (
  store: storeClientType,
  identifierKey: string
): Promise<RateLimitData | undefined> => {
  if (store instanceof Map) {
    return store.get(identifierKey);
  }

  const rateLimitDataString = await store.get(identifierKey);
  const rateLimitData = rateLimitDataString
    ? (JSON.parse(rateLimitDataString as string) as RateLimitData)
    : undefined;

  return rateLimitData;
};

/**
 * Sets rate-limiting data for a specific identifier key in the store.
 *
 * @param {storeClientType} store - The store to set rate limit data in.
 * @param {string} identifierKey - The unique key for the rate limit data.
 * @param {RateLimitData} rateLimitData - The rate limit data to set.
 * @returns {Promise<void>} - A promise that resolves once the data is set.
 */
const setRateLimitData = async (
  store: storeClientType,
  identifierKey: string,
  rateLimitData: RateLimitData
): Promise<void> => {
  if (store instanceof Map) {
    store.set(identifierKey, rateLimitData);
    return;
  }

  await store.set(identifierKey, JSON.stringify(rateLimitData));
};

/**
 * Modifies the response by decrementing request counts for failed requests if needed.
 *
 * @param {storeClientType} store - The store managing rate-limiting data.
 * @param {string} identifierKey - The unique key for the rate limit data.
 * @param {boolean} skipFailedRequests - Whether to skip failed requests for rate-limiting.
 * @param {Response} response - The Express response object.
 * @returns {Promise<void>} - A promise that resolves once the response is modified.
 */
export const modifyResponse = async (
  store: storeClientType,
  identifierKey: string,
  skipFailedRequests: boolean,
  response: Response
): Promise<void> => {
  const rateLimitData = (await getRateLimitData(
    store,
    identifierKey
  )) as RateLimitData;

  if (skipFailedRequests && response.statusCode >= 400) {
    setRateLimitData(store, identifierKey, {
      ...rateLimitData,
      requests: rateLimitData.requests - 1,
    });
  }
};
