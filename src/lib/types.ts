import { Request, Response } from "express";

export type limiterOptions = {
  key?: (request: Request, response: Response) => string; // Key to identify the rate limit
  skip?: Array<string>; // Skip rate limiting for these keys
  skipFailedRequests?: boolean; // Skip failed requests from rate limiting
  limit: number; // Request limit per IP
  window: number; // Allowed 'limit' number of requests in 'window' seconds.
  message?: string; // Message to send on hitting the Rate limit
  statusCode?: number; // Status code to send on hitting the Rate limit
  cleanUpInterval?: number; // Interval to cleanup the rate data
};

export type RateLimitData = {
  requests: number;
  expires: number;
};
