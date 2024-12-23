import { Request, Response } from "express";
import {
  logsOptions,
  RateLimitData,
  storeClientType,
  storeType,
} from "../types";
import { writeLogs } from "./logs";
import { RedisClientType } from "redis";

export const setClientStore = (cleanUpInterval: number, store?: storeType) => {
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

export const getRateLimitData = async (
  store: storeClientType,
  identifierKey: string
) => {
  if (store instanceof Map) {
    return store.get(identifierKey);
  }

  const rateLimitDataString = await store.get(identifierKey);
  const rateLimitData = rateLimitDataString
    ? (JSON.parse(rateLimitDataString as string) as RateLimitData)
    : undefined;

  return rateLimitData;
};

const setRateLimitData = async (
  store: storeClientType,
  identifierKey: string,
  rateLimitData: RateLimitData
) => {
  if (store instanceof Map) {
    store.set(identifierKey, rateLimitData);
    return;
  }

  await store.set(identifierKey, JSON.stringify(rateLimitData));
};

export const modifyResponse = async (
  store: storeClientType,
  identifierKey: string,
  skipFailedRequests: boolean,
  response: Response
) => {
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
