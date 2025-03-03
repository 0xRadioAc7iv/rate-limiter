import { Request } from "express";
import {
  HeadersArgs,
  RateLimitDataType,
  Store,
  HeadersType,
  RateLimitOptions,
} from "../lib/types";
import { DEFAULT_RATE_LIMIT, DEFAULT_RATE_WINDOW } from "../lib/constants";
import { FastifyRequest } from "fastify";

/**
 * Handles setting and constructing rate limit headers.
 */
class Headers {
  /**
   * The type of headers to be used.
   * @type {HeadersType}
   */
  headersType: HeadersType;

  /**
   * Creates an instance of Headers.
   * @param {HeadersType} headersType - The type of headers.
   */
  constructor(headersType: HeadersType) {
    this.headersType = headersType;
  }

  /**
   * Computes and retrieves rate limit data for a request.
   * @param {(request?: Request) => RateLimitOptions} limitOptions - Function returning rate limit options.
   * @param {Request} request - The incoming request object.
   * @param {(req: Request) => string} [key] - Function to generate an identifier key.
   * @param {Store} store - The storage mechanism.
   * @returns {Promise<{max: number, window: number, requestTime: number, identifierKey: string, rateData: any}>}
   *   The headers data.
   */
  async setHeadersData(
    limitOptions: (request?: Request | FastifyRequest) => RateLimitOptions,
    request: Request | FastifyRequest,
    key: ((req: Request | FastifyRequest) => string) | undefined,
    store: Store
  ): Promise<{
    max: number;
    window: number;
    requestTime: number;
    identifierKey: string;
    rateData: RateLimitDataType | undefined;
  }> {
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

  /**
   * Sets the rate limit headers on the response.
   * @param {HeadersArgs} args - The headers arguments.
   */
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

      if ("setHeaders" in res) {
        res.setHeader("RateLimit-Policy", `${limit};w=${window}`);
        res.setHeaders(headers);
      } else if ("header" in res) {
        res.header("RateLimit-Policy", `${limit};w=${window}`);
        for (const [key, value] of headers) {
          res.header(key, value);
        }
      } else {
        throw new Error("Unsupported response object");
      }

      return;
    }

    const headers = this.constructHeaders(
      headersType,
      limitValue,
      remainingValue,
      resetTime
    );

    if ("setHeaders" in res) {
      res.setHeaders(headers);
    } else if ("header" in res) {
      for (const [key, value] of headers) {
        res.header(key, value);
      }
    } else {
      throw new Error("Unsupported response object");
    }
  }

  /**
   * Constructs rate limit headers based on the specified type.
   * @param {HeadersType} headersType - The headers type.
   * @param {string} limit - The rate limit value.
   * @param {string} remaining - The remaining requests.
   * @param {string} reset - The reset time.
   * @returns {Map<string, string>} The constructed headers.
   */
  constructHeaders(
    headersType: HeadersType,
    limit: string,
    remaining: string,
    reset: string
  ): Map<string, string> {
    const headers = new Map<string, string>();

    if (headersType === "draft-6") {
      headers.set("RateLimit-Limit", limit);
      headers.set("RateLimit-Remaining", remaining);
      headers.set("RateLimit-Reset", reset);
    } else if (headersType === "draft-7") {
      headers.set("limit", limit);
      headers.set("remaining", remaining);
      headers.set("reset", reset);
    } else if (headersType === "draft-8") {
      headers.set("RateLimit", `${limit}, ${remaining}, ${reset}`);
    } else {
      headers.set("X-RateLimit-Limit", limit);
      headers.set("X-RateLimit-Remaining", remaining);
      headers.set("X-RateLimit-Reset", reset);
    }

    return headers;
  }
}

export { Headers };
