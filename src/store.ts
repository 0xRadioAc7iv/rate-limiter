import { RedisClientType } from "redis";
import { Response } from "express";
import { HeadersType, RateLimitDataType, Store } from "./types";

export class MemoryStore implements Store {
  store: Map<string, RateLimitDataType>;

  limit: number;
  window: number;
  skip?: Array<string>;

  constructor(limit: number, window: number, skip?: Array<string>) {
    this.store = new Map<string, RateLimitDataType>();
    this.limit = limit;
    this.window = window;
    this.skip = skip ? skip : [];

    this.startCleanupInterval();
  }

  startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      for (const [ip, rateData] of this.store) {
        if (rateData.requests == 0 || now > rateData.expires) {
          this.store.delete(ip);
        }
      }
    }, 1000 * this.window);
  }

  set(key: string, value: RateLimitDataType) {
    this.store.set(key, value);
  }

  async get(key: string) {
    return this.store.get(key);
  }

  modifyResponse(
    response: Response,
    identifierKey: string,
    skipFailedRequests: boolean
  ) {
    response.on("finish", async () => {
      const rateLimitData = await this.get(identifierKey);

      if (skipFailedRequests && response.statusCode >= 400) {
        this.set(identifierKey, {
          expires: rateLimitData?.expires as number,
          requests: (rateLimitData?.requests as number) - 1,
        });
      }
    });

    return response;
  }

  checkAndSetRateLimitData(
    max: number,
    window: number,
    requestTime: number,
    identifierKey: string,
    rateData: RateLimitDataType | undefined,
    message: string | undefined,
    statusCode: number,
    headersType: HeadersType,
    response: Response
  ) {
    const firstRequestData = {
      requests: 1,
      expires: requestTime + window * 1000,
    };

    if (!rateData) {
      this.set(identifierKey, firstRequestData);
    } else {
      if (requestTime >= rateData.expires) {
        this.set(identifierKey, firstRequestData);
      } else {
        if (rateData.requests > max - 1) {
          const timeLeft = Math.ceil((rateData.expires - requestTime) / 1000);

          if (headersType === "legacy") {
            response.setHeader("Retry-After", timeLeft);
          }

          response.status(statusCode).json({
            error: message
              ? message
              : `Rate limit exceeded. Try again in ${timeLeft} seconds.`,
          });

          return true;
        }

        this.set(identifierKey, {
          ...rateData,
          requests: rateData.requests + 1,
        });
      }
    }
  }
}

export class RedisStore implements Store {
  store: RedisClientType;
  limit: number;
  window: number;
  skip?: Array<string>;

  constructor(
    limit: number,
    window: number,
    store: RedisClientType,
    skip?: Array<string>
  ) {
    this.store = store;
    this.limit = limit;
    this.window = window;
    this.skip = skip ? skip : [];
  }

  async set(key: string, value: RateLimitDataType) {
    await this.store.set(key, JSON.stringify(value), {
      EX: this.window,
      NX: true,
    });
  }

  async get(key: string) {
    const data = await this.store.get(key);
    const parsedData = data
      ? (JSON.parse(data as string) as RateLimitDataType)
      : undefined;

    return parsedData;
  }

  modifyResponse(
    response: Response,
    identifierKey: string,
    skipFailedRequests: boolean
  ) {
    response.on("finish", async () => {
      const rateLimitData = await this.get(identifierKey);

      if (skipFailedRequests && response.statusCode >= 400) {
        await this.set(identifierKey, {
          expires: rateLimitData?.expires as number,
          requests: (rateLimitData?.requests as number) - 1,
        });
      }
    });

    return response;
  }

  async checkAndSetRateLimitData(
    max: number,
    window: number,
    requestTime: number,
    identifierKey: string,
    rateData: RateLimitDataType | undefined,
    message: string | undefined,
    statusCode: number,
    headersType: HeadersType,
    response: Response
  ) {
    const firstRequestData = {
      requests: 1,
      expires: requestTime + window * 1000,
    };

    if (!rateData) {
      await this.set(identifierKey, firstRequestData);
    } else {
      if (requestTime >= rateData.expires) {
        await this.set(identifierKey, firstRequestData);
      } else {
        if (rateData.requests > max - 1) {
          const timeLeft = Math.ceil((rateData.expires - requestTime) / 1000);

          if (headersType === "legacy") {
            response.setHeader("Retry-After", timeLeft);
          }

          response.status(statusCode).json({
            error: message
              ? message
              : `Rate limit exceeded. Try again in ${timeLeft} seconds.`,
          });

          return true;
        }

        await this.set(identifierKey, {
          ...rateData,
          requests: rateData.requests + 1,
        });
      }
    }
  }
}
