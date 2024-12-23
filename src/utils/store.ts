import { Request, Response } from "express";
import {
  logsOptions,
  RateLimitData,
  storeClientType,
  storeType,
} from "../types";
import { writeLogs } from "./logs";

export const setClientStore = (cleanUpInterval: number, store?: storeType) => {
  let clientStore: storeClientType;

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
  } else {
    clientStore = store.client;
  }

  return clientStore;
};

export const modifyResponseIfNeededAndWriteLogs = (
  request: Request,
  response: Response,
  logs: logsOptions | undefined,
  identifierKey: string,
  skipFailedRequests: boolean,
  store: Map<string, RateLimitData> | storeClientType
): Response => {
  let rateLimitData: RateLimitData;

  response.on("finish", async () => {
    if (store instanceof Map) {
      rateLimitData = store.get(identifierKey) as RateLimitData;

      if (skipFailedRequests && response.statusCode >= 400) {
        store.set(identifierKey, {
          ...rateLimitData,
          requests: rateLimitData.requests - 1,
        });
      }
    } else {
      const rateLimitDataString = await store.get(identifierKey);
      rateLimitData = JSON.parse(
        rateLimitDataString as string
      ) as RateLimitData;

      if (skipFailedRequests && response.statusCode >= 400) {
        const updatedData = {
          ...rateLimitData,
          requests: rateLimitData.requests - 1,
        };
        store.set(identifierKey, JSON.stringify(updatedData));
      }
    }

    if (logs) writeLogs(logs.directory, request);
  });

  return response;
};

export const checkAndSetRateLimitData = (
  max: number,
  window: number,
  requestTime: number,
  identifierKey: string,
  rateData: RateLimitData | undefined,
  message: string | undefined,
  statusCode: number,
  legacyHeaders: boolean,
  response: Response,
  store: Map<string, RateLimitData> | storeClientType
): true | void => {
  const firstRequestData = {
    requests: 1,
    expires: requestTime + window * 1000,
  };

  if (!rateData) {
    if (store instanceof Map) {
      store.set(identifierKey, firstRequestData);
    } else {
      store.set(identifierKey, JSON.stringify(firstRequestData));
    }
  } else {
    if (requestTime >= rateData.expires) {
      if (store instanceof Map) {
        store.set(identifierKey, firstRequestData);
      } else {
        store.set(identifierKey, JSON.stringify(firstRequestData));
      }
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

      if (store instanceof Map) {
        store.set(identifierKey, {
          ...rateData,
          requests: rateData.requests + 1,
        });
      } else {
        store.set(
          identifierKey,
          JSON.stringify({
            ...rateData,
            requests: rateData.requests + 1,
          })
        );
      }
    }
  }
};
