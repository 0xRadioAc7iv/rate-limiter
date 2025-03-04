import { RateLimiterMiddleware } from "../../core/limiter";
import { MemoryStore, MongoStore, RedisStore } from "../../core/store";
import { Headers } from "../../core/headers";
import { Logger } from "../../core/logger";
import { limiterOptions } from "../../lib/types";
import { createClient } from "redis";
import { Db } from "mongodb";
import { Request, Response } from "express";

const MAX = 5;
const WINDOW = 60;
const KEY = "127.0.0.1";

const defaultOptions: limiterOptions = {
  limitOptions: () => {
    return { max: MAX, window: WINDOW };
  },
};

jest.mock("../../core/store", () => ({
  MemoryStore: jest.fn().mockImplementation(() => ({
    checkAndSetRateLimitData: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    skip: [],
  })),
  MongoStore: jest.fn().mockImplementation(() => ({
    checkAndSetRateLimitData: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
  })),
  RedisStore: jest.fn().mockImplementation(() => ({
    checkAndSetRateLimitData: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
  })),
}));

jest.mock("../../core/logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    createDirectoryIfDoesNotExist: jest.fn(),
  })),
}));

const mockCollection = {
  findOne: jest.fn(),
  updateOne: jest.fn(),
  insertOne: jest.fn(),
};

export const mockDb = {
  collection: jest.fn().mockReturnValue(mockCollection),
} as unknown as Db;

const mockRequest = (
  body = {},
  params = {},
  query = {},
  headers = {}
): Partial<Request> => {
  return {
    body,
    params,
    query,
    headers,
  };
};

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    setHeader: jest.fn(),
    setHeaders: jest.fn(),
    status: jest.fn().mockImplementation(function (this: any) {
      return this;
    }),
    json: jest.fn(),
  };
  return res;
};

describe("tests core limiter", () => {
  let rateLimiter: RateLimiterMiddleware;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  describe("Constructor", () => {
    test("should initialize with default options and MemoryStore", () => {
      rateLimiter = new RateLimiterMiddleware(defaultOptions);

      expect(MemoryStore).toHaveBeenCalled();
      expect(rateLimiter).toBeDefined();
    });

    test("should use RedisStore if storeType is 'redis'", () => {
      rateLimiter = new RateLimiterMiddleware({
        ...defaultOptions,
        storeType: "redis",
        externalStore: createClient(),
      });

      expect(RedisStore).toHaveBeenCalled();
      expect(rateLimiter).toBeDefined();
    });

    test("should use MongoStore if storeType is 'mongodb'", () => {
      rateLimiter = new RateLimiterMiddleware({
        ...defaultOptions,
        storeType: "mongodb",
        externalStore: mockDb,
      });

      expect(MongoStore).toHaveBeenCalled();
    });

    test("should throw an error if Redis is selected but no external store is provided", () => {
      expect(
        () =>
          new RateLimiterMiddleware({ ...defaultOptions, storeType: "redis" })
      ).toThrow("Configured Redis as Store but no Redis Store provided.");
    });

    test("should initialize Logger if logging is enabled", () => {
      rateLimiter = new RateLimiterMiddleware({
        ...defaultOptions,
        logs: { directory: "/logs" },
      });

      expect(Logger).toHaveBeenCalled();
    });
  });

  describe("processRequest", () => {
    test("should set headers and process request", async () => {
      const rateLimiter = new RateLimiterMiddleware(defaultOptions);
      const request = { ip: KEY } as Request;
      const response = mockResponse() as Response;

      const { shouldBlock, identifierKey } = await rateLimiter.processRequest(
        request,
        response
      );

      expect(shouldBlock).toBeFalsy();
      expect(identifierKey).toBe(KEY);
    });
  });

  describe("handleResponse", () => {
    test("should decrement request count if skipFailedRequests is true and statusCode >= 400", async () => {
      const mockStore = {
        get: jest
          .fn()
          .mockResolvedValue({ requests: 5, expires: Date.now() + 60000 }),
        set: jest.fn(),
      };

      const rateLimiter = new RateLimiterMiddleware({
        ...defaultOptions,
        skipFailedRequests: true,
      });
      (rateLimiter as any).store = mockStore;

      await rateLimiter.handleResponse("test-key", 429);

      expect(mockStore.get).toHaveBeenCalledWith("test-key");
      expect(mockStore.set).toHaveBeenCalledWith("test-key", {
        requests: 4,
        expires: expect.any(Number),
      });
    });
  });
});
