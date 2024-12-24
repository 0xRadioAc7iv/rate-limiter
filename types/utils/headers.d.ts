import { Request, Response } from "express";
import { RateLimitData, RateLimitHeadersArgs, RateLimitOptions, storeClientType } from "../types";
/**
 * Sets the rate limit headers on the response based on the provided options.
 *
 * @param {RateLimitHeadersArgs} args - Arguments for setting the rate limit headers.
 * @property {Response} args.res - Express response object.
 * @property {boolean} [args.legacyHeaders=DEFAULT_LEGACY_HEADERS] - Whether to include legacy headers.
 * @property {standardHeadersType} [args.standardHeaders] - Standard headers version to use.
 * @property {number} args.limit - Maximum number of requests allowed.
 * @property {number} args.requests - Number of requests made so far.
 * @property {number} args.expires - Timestamp when the rate limit window expires.
 * @property {number} args.window - Length of the rate limit window (in seconds).
 * @property {number} args.requestTime - Timestamp of the current request.
 */
export declare const setRateLimitHeaders: ({ res, legacyHeaders, standardHeaders, limit, requests, expires, window, requestTime, }: RateLimitHeadersArgs) => void;
/**
 * Sets the rate limit headers data by fetching and calculating rate limit parameters.
 *
 * @param {(request?: Request) => RateLimitOptions} limitOptions - Function to retrieve rate limit options for the request.
 * @param {Request} request - Express request object.
 * @param {Response} response - Express response object.
 * @param {(req: Request, res: Response) => string} [key] - Function to generate a unique key for rate limiting.
 * @param {storeClientType} clientStore - Storage client for managing rate limit data.
 * @returns {Promise<{
 *   max: number;
 *   window: number;
 *   requestTime: number;
 *   identifierKey: string;
 *   rateData: RateLimitData | undefined;
 * }>} - Object containing rate limit data and associated parameters.
 */
export declare const setRateLimitHeadersData: (limitOptions: (request?: Request) => RateLimitOptions, request: Request, response: Response, key: ((req: Request, res: Response) => string) | undefined, clientStore: storeClientType) => Promise<{
    max: number;
    window: number;
    requestTime: number;
    identifierKey: string;
    rateData: RateLimitData | undefined;
}>;
