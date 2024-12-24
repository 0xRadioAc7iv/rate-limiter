import { Request, Response } from "express";
import { logsOptions, RateLimitData, storeClientType, storeType } from "../types";
/**
 * Sets the client store for rate-limiting, either using a provided store or a local in-memory store.
 *
 * @param {number} cleanUpInterval - Interval (in seconds) to clean up expired rate limit data.
 * @param {storeType} [store] - Optional store to use. If not provided, a local Map store is used.
 * @returns {storeClientType} - The store client to be used for rate-limiting.
 */
export declare const setClientStore: (cleanUpInterval: number, store?: storeType) => storeClientType;
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
export declare const modifyResponseIfNeededAndWriteLogs: (request: Request, response: Response, logs: logsOptions | undefined, identifierKey: string, skipFailedRequests: boolean, store: storeClientType) => Response;
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
export declare const checkAndSetRateLimitData: (max: number, window: number, requestTime: number, identifierKey: string, rateData: RateLimitData | undefined, message: string | undefined, statusCode: number, legacyHeaders: boolean, response: Response, store: storeClientType) => Promise<true | void>;
/**
 * Retrieves rate-limiting data for a specific identifier key from the store.
 *
 * @param {storeClientType} store - The store to retrieve rate limit data from.
 * @param {string} identifierKey - The unique key for the rate limit data.
 * @returns {Promise<RateLimitData | undefined>} - The rate limit data or `undefined` if not found.
 */
export declare const getRateLimitData: (store: storeClientType, identifierKey: string) => Promise<RateLimitData | undefined>;
/**
 * Modifies the response by decrementing request counts for failed requests if needed.
 *
 * @param {storeClientType} store - The store managing rate-limiting data.
 * @param {string} identifierKey - The unique key for the rate limit data.
 * @param {boolean} skipFailedRequests - Whether to skip failed requests for rate-limiting.
 * @param {Response} response - The Express response object.
 * @returns {Promise<void>} - A promise that resolves once the response is modified.
 */
export declare const modifyResponse: (store: storeClientType, identifierKey: string, skipFailedRequests: boolean, response: Response) => Promise<void>;
