import { Request, Response } from "express";
import { Headers } from "../../core/headers";
import { MemoryStore } from "../../core/store";
import { FastifyReply, FastifyRequest } from "fastify";

interface TestRequest extends Request {
  user?: string;
}

const LIMIT = "1000";
const REMAINING = "10";
const RESET = "50";
const MAX = 5;
const WINDOW = 60;

const key = (request: Request | FastifyRequest | TestRequest) => {
  return (request as TestRequest).user || "user";
};

const limitOptions = () => {
  return { max: MAX, window: WINDOW };
};

const mockResponse = (): Partial<Response> => {
  return {
    setHeader: jest.fn(),
    setHeaders: jest.fn(),
  };
};

const mockReply = (): Partial<FastifyReply> => {
  return {
    header: jest.fn(),
  };
};

describe("tests should construct", () => {
  test("legacy headers", () => {
    const headers = new Headers("legacy");

    const legacyHeaders = headers.constructHeaders(
      headers.headersType,
      LIMIT,
      REMAINING,
      RESET
    );

    expect(legacyHeaders.get("X-RateLimit-Limit")).toBe(LIMIT);
    expect(legacyHeaders.get("X-RateLimit-Remaining")).toBe(REMAINING);
    expect(legacyHeaders.get("X-RateLimit-Reset")).toBe(RESET);
  });

  test("draft-6 headers", () => {
    const headers = new Headers("draft-6");

    const legacyHeaders = headers.constructHeaders(
      headers.headersType,
      LIMIT,
      REMAINING,
      RESET
    );

    expect(legacyHeaders.get("RateLimit-Limit")).toBe(LIMIT);
    expect(legacyHeaders.get("RateLimit-Remaining")).toBe(REMAINING);
    expect(legacyHeaders.get("RateLimit-Reset")).toBe(RESET);
  });

  test("draft-7 headers", () => {
    const headers = new Headers("draft-7");

    const legacyHeaders = headers.constructHeaders(
      headers.headersType,
      LIMIT,
      REMAINING,
      RESET
    );

    expect(legacyHeaders.get("limit")).toBe(LIMIT);
    expect(legacyHeaders.get("remaining")).toBe(REMAINING);
    expect(legacyHeaders.get("reset")).toBe(RESET);
  });

  test("draft-8 headers", () => {
    const headers = new Headers("draft-8");

    const legacyHeaders = headers.constructHeaders(
      headers.headersType,
      LIMIT,
      REMAINING,
      RESET
    );

    expect(legacyHeaders.get("RateLimit")).toBe(
      `${LIMIT}, ${REMAINING}, ${RESET}`
    );
  });
});

describe("tests should set headers data", () => {
  test("when key is not supplied", async () => {
    const headers = new Headers("legacy");
    const store = new MemoryStore(MAX, WINDOW);

    const { max, window, requestTime, identifierKey, rateData } =
      await headers.setHeadersData(
        limitOptions,
        { ip: "127.0.0.1" } as Request,
        undefined,
        store
      );

    expect(max).toBe(MAX);
    expect(window).toBe(WINDOW);
    expect(requestTime).toBe(requestTime);
    expect(identifierKey).toBe("127.0.0.1");
    expect(rateData).toBe(undefined);

    clearInterval(store.interval);
  });

  test("when key is supplied", async () => {
    const headers = new Headers("legacy");
    const store = new MemoryStore(MAX, WINDOW);

    const mockRequest: TestRequest = {
      user: "user",
    } as TestRequest;

    const { max, window, requestTime, identifierKey, rateData } =
      await headers.setHeadersData(limitOptions, mockRequest, key, store);

    expect(max).toBe(MAX);
    expect(window).toBe(WINDOW);
    expect(requestTime).toBe(requestTime);
    expect(identifierKey).toBe("user");
    expect(rateData).toBe(undefined);

    clearInterval(store.interval);
  });
});

describe("tests should set headers", () => {
  describe("when not legacy", () => {
    describe("for express", () => {
      const headers = new Headers("draft-6");
      const response = mockResponse() as Response;

      headers.setHeaders({
        res: response,
        headersType: "draft-6",
        limit: Number(LIMIT),
        requests: 10,
        expires: 1000,
        window: WINDOW,
        requestTime: 900,
      });

      it("should set response headers", () => {
        expect(response.setHeader).toHaveBeenCalled();
        expect(response.setHeaders).toHaveBeenCalled();
      });
    });

    describe("for fastify", () => {
      const headers = new Headers("draft-6");
      const response = mockReply() as FastifyReply;

      headers.setHeaders({
        res: response,
        headersType: "draft-6",
        limit: Number(LIMIT),
        requests: 10,
        expires: 1000,
        window: WINDOW,
        requestTime: 900,
      });

      it("should set response headers", () => {
        expect(response.header).toHaveBeenCalled();
      });
    });
  });

  describe("when legacy", () => {
    describe("for express", () => {
      const headers = new Headers("legacy");
      const response = mockResponse() as Response;

      headers.setHeaders({
        res: response,
        headersType: "legacy",
        limit: Number(LIMIT),
        requests: 10,
        expires: 1000,
        window: WINDOW,
        requestTime: 900,
      });

      it("should set response headers", () => {
        expect(response.setHeaders).toHaveBeenCalled();
      });
    });

    describe("for fastify", () => {
      const headers = new Headers("legacy");
      const response = mockReply() as FastifyReply;

      headers.setHeaders({
        res: response,
        headersType: "legacy",
        limit: Number(LIMIT),
        requests: 10,
        expires: 1000,
        window: WINDOW,
        requestTime: 900,
      });

      it("should set response headers", () => {
        expect(response.header).toHaveBeenCalled();
      });
    });
  });
});
