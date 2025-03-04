import { Db } from "mongodb";
import { MemoryStore, MongoStore, RedisStore } from "../../core/store";
import { Response } from "express";
import { FastifyReply } from "fastify";

const MAX = 5;
const WINDOW = 60;
const KEY = "127.0.0.1";
const VALUE = { expires: 1000, requests: 100 };
const REQUEST_TIME = 1000;
const REDIS_EXPIRY = { EX: WINDOW, NX: true };

const mockRedisClient = {
  set: jest.fn(),
  get: jest.fn().mockResolvedValue(JSON.stringify(VALUE)),
};

const mockCollection = {
  updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
  findOne: jest.fn().mockResolvedValue(null),
};

const mockDb = {
  collection: jest.fn().mockReturnValue(mockCollection),
} as unknown as Db;

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

const mockReply = (): Partial<FastifyReply> => {
  const res: Partial<FastifyReply> = {
    hijack: jest.fn(),
    header: jest.fn(),
    status: jest.fn().mockImplementation(function (this: any) {
      return this;
    }),
    send: jest.fn(),
  };
  return res;
};

describe("tests store", () => {
  describe("memory", () => {
    test("should set and get values properly", async () => {
      const store = new MemoryStore(MAX, WINDOW);

      await store.set(KEY, VALUE);
      const value = await store.get(KEY);

      expect(value).toBe(VALUE);
      clearInterval(store.interval);
    });
  });

  describe("redis", () => {
    test("should set and get values properly", async () => {
      const store = new RedisStore(MAX, WINDOW, mockRedisClient as any);

      await store.set(KEY, VALUE);
      const value = await store.get(KEY);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        KEY,
        JSON.stringify(VALUE),
        REDIS_EXPIRY
      );
      expect(mockRedisClient.get).toHaveBeenCalledWith(KEY);
      expect(value).toStrictEqual(VALUE);
    });
  });

  describe("mongo", () => {
    let store: MongoStore;

    beforeEach(() => {
      store = new MongoStore(MAX, WINDOW, mockDb);
      jest.clearAllMocks();
    });

    test("should set a value in MongoDB", async () => {
      await store.set(KEY, VALUE);

      expect(mockDb.collection).toHaveBeenCalledWith("rate-limits");
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { key: KEY },
        { $set: VALUE },
        { upsert: true }
      );
    });

    test("should get a value from MongoDB", async () => {
      mockCollection.findOne.mockResolvedValueOnce({
        requests: 3,
        expires: 123456,
      });

      const result = await store.get(KEY);

      expect(mockDb.collection).toHaveBeenCalledWith("rate-limits");
      expect(mockCollection.findOne).toHaveBeenCalledWith({ key: KEY });
      expect(result).toEqual({ requests: 3, expires: 123456 });
    });

    test("should return undefined if key is not found", async () => {
      mockCollection.findOne.mockResolvedValueOnce(null);

      const result = await store.get(KEY);

      expect(result).toBeUndefined();
    });
  });
});

describe("tests store check and set rate limit data", () => {
  let store: MemoryStore;
  let response: Response;

  beforeAll(() => {
    store = new MemoryStore(MAX, WINDOW);
    response = mockResponse() as Response;
    jest.clearAllMocks();
  });

  afterAll(() => {
    clearInterval(store.interval);
  });

  test("should set default rate limit data if first request", async () => {
    await store.checkAndSetRateLimitData(
      MAX,
      WINDOW,
      REQUEST_TIME,
      KEY,
      undefined,
      undefined,
      429,
      "legacy",
      response
    );

    const value = await store.get(KEY);
    expect(value).toStrictEqual({
      requests: 1,
      expires: REQUEST_TIME + WINDOW * 1000,
    });
  });

  test("should set default rate limit data if rate limit is reset", async () => {
    await store.checkAndSetRateLimitData(
      MAX,
      WINDOW,
      REQUEST_TIME,
      KEY,
      { requests: 100, expires: 50 },
      undefined,
      429,
      "legacy",
      response
    );

    const value = await store.get(KEY);
    expect(value).toStrictEqual({
      requests: 1,
      expires: REQUEST_TIME + WINDOW * 1000,
    });
  });

  test("should increase rate limit when under the limit", async () => {
    await store.checkAndSetRateLimitData(
      MAX,
      WINDOW,
      REQUEST_TIME,
      KEY,
      { requests: 1, expires: 5000 },
      undefined,
      429,
      "legacy",
      response
    );

    const value = await store.get(KEY);
    expect(value).toStrictEqual({
      requests: 2,
      expires: 5000,
    });
  });

  describe("should return true if rate limit is reached", () => {
    describe("with legacy headers", () => {
      test("express", async () => {
        const isRateLimitReached = await store.checkAndSetRateLimitData(
          MAX,
          WINDOW,
          REQUEST_TIME,
          KEY,
          { requests: 5, expires: 5000 },
          undefined,
          429,
          "legacy",
          response
        );

        const timeLeft = Math.ceil((5000 - 1000) / 1000);

        expect(response.setHeader).toHaveBeenCalledWith(
          "Retry-After",
          timeLeft
        );
        expect(isRateLimitReached).toBe(true);
      });

      test("fastify", async () => {
        const response = mockReply() as FastifyReply;

        const isRateLimitReached = await store.checkAndSetRateLimitData(
          MAX,
          WINDOW,
          REQUEST_TIME,
          KEY,
          { requests: 5, expires: 5000 },
          undefined,
          429,
          "legacy",
          response
        );

        const timeLeft = Math.ceil((5000 - 1000) / 1000);

        expect(response.header).toHaveBeenCalledWith("Retry-After", timeLeft);
        expect(isRateLimitReached).toBe(true);
      });
    });

    describe("without legacy headers", () => {
      test("express", async () => {
        const isRateLimitReached = await store.checkAndSetRateLimitData(
          MAX,
          WINDOW,
          REQUEST_TIME,
          KEY,
          { requests: 5, expires: 5000 },
          undefined,
          429,
          "draft-6",
          response
        );

        expect(isRateLimitReached).toBe(true);
      });

      test("fastify", async () => {
        const response = mockReply() as FastifyReply;

        const isRateLimitReached = await store.checkAndSetRateLimitData(
          MAX,
          WINDOW,
          REQUEST_TIME,
          KEY,
          { requests: 5, expires: 5000 },
          undefined,
          429,
          "draft-6",
          response
        );

        expect(isRateLimitReached).toBe(true);
      });
    });
  });
});
