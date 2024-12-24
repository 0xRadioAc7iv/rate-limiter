import { Request, Response } from "express";
export type limiterOptions = {
    key?: (request: Request, response: Response) => string;
    skip?: Array<string>;
    skipFailedRequests?: boolean;
    limit: number;
    window: number;
    message?: string;
    statusCode?: number;
    cleanUpInterval?: number;
};
export type RateLimitData = {
    requests: number;
    expires: number;
};
