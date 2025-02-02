import { Request } from "express";
import { HeadersArgs, Store } from "./types";
import { HeadersType } from "./types";
import { RateLimitOptions } from "./types";
import { DEFAULT_RATE_LIMIT, DEFAULT_RATE_WINDOW } from "./constants";

class Headers {
  headersType: HeadersType;

  constructor(headersType: HeadersType) {
    this.headersType = headersType;
  }

  async setHeadersData(
    limitOptions: (request?: Request) => RateLimitOptions,
    request: Request,
    key: ((req: Request) => string) | undefined,
    store: Store
  ) {
    const { max, window } = limitOptions
      ? limitOptions(request)
      : { max: DEFAULT_RATE_LIMIT, window: DEFAULT_RATE_WINDOW };
    const requestTime = Date.now();
    const identifierKey = key ? key(request) : (request.ip as string);
    const rateData = await store.get(identifierKey);

    return {
      max,
      window,
      requestTime,
      identifierKey,
      rateData,
    };
  }

  setHeaders({
    res,
    headersType,
    limit,
    requests,
    expires,
    window,
    requestTime,
  }: HeadersArgs) {
    const limitValue = limit.toString();
    const remainingValue = (limit - requests).toString();
    const resetTime = Math.abs(
      Math.ceil((expires - requestTime) / 1000)
    ).toString();

    if (headersType !== "legacy") {
      const headers = this.constructHeaders(
        headersType,
        limitValue,
        remainingValue,
        resetTime
      );

      res.setHeader("RateLimit-Policy", `${limit};w=${window}`);
      res.setHeaders(headers);
      return;
    }

    const headers = this.constructHeaders(
      headersType,
      limitValue,
      remainingValue,
      resetTime
    );

    res.setHeaders(headers);
  }

  constructHeaders = (
    headersType: HeadersType,
    limit: string,
    remaining: string,
    reset: string
  ): Map<string, string> => {
    const headers = new Map<string, string>([]);

    if (headersType === "draft-6") {
      headers.set("RateLimit-Limit", limit);
      headers.set("RateLimit-Remaining", remaining);
      headers.set("RateLimit-Reset", reset);
    } else if (headersType === "draft-7") {
      headers.set("limit", limit);
      headers.set("remaining", remaining);
      headers.set("reset", reset);
    } else {
      headers.set("X-RateLimit-Limit", limit);
      headers.set("X-RateLimit-Remaining", remaining);
      headers.set("X-RateLimit-Reset", reset);
    }

    return headers;
  };
}

export { Headers };
