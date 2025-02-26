import fastifyPlugin from "fastify-plugin";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { limiterOptions, LoggerClass, Store } from "./types";
import {
  DEFAULT_RATE_LIMIT,
  DEFAULT_RATE_LIMIT_HEADERS_TYPE,
  DEFAULT_RATE_WINDOW,
  DEFAULT_SKIP_FAILED_REQUESTS,
  DEFAULT_STATUS_CODE,
} from "./constants";
import { MemoryStore, MongoStore, RedisStore } from "./store";
import { Logger } from "./logger";
import { Headers } from "./headers";

declare module "fastify" {
  interface FastifyRequest {
    startTime?: bigint;
  }
}

async function rateLimitingMiddleware(
  fastify: FastifyInstance,
  {
    key,
    skip,
    skipFailedRequests = DEFAULT_SKIP_FAILED_REQUESTS,
    message,
    statusCode = DEFAULT_STATUS_CODE,
    headersType = DEFAULT_RATE_LIMIT_HEADERS_TYPE,
    logs,
    limitOptions,
    storeType = "memory",
    externalStore,
  }: limiterOptions
) {
  let store: Store;
  let logger: LoggerClass | undefined;
  let idKey: string;

  // Initialize appropriate storage (Memory, Redis or MongoDB)
  if (storeType === "redis") {
    if (!externalStore || !("get" in externalStore))
      throw new Error("Configured Redis as Store but no Redis Store provided.");

    store = new RedisStore(
      DEFAULT_RATE_LIMIT,
      DEFAULT_RATE_WINDOW,
      externalStore
    );
  } else if (storeType === "mongodb") {
    if (!externalStore || !("collection" in externalStore))
      throw new Error("Configured Mongo as Store but no Mongo Store provided.");

    store = new MongoStore(
      DEFAULT_RATE_LIMIT,
      DEFAULT_RATE_WINDOW,
      externalStore
    );
  } else {
    store = new MemoryStore(DEFAULT_RATE_LIMIT, DEFAULT_RATE_WINDOW, skip);
  }

  const headers = new Headers(headersType);

  // Initialize logger if logging is enabled
  if (logs) {
    logger = new Logger(logs.directory);
    logger.createDirectoryIfDoesNotExist(logs.directory);
  }

  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { max, window, requestTime, identifierKey, rateData } =
        await headers.setHeadersData(limitOptions, request, key, store);

      idKey = identifierKey;

      if (store.skip && store.skip.includes(identifierKey)) return;

      headers.setHeaders({
        res: reply,
        headersType,
        limit: max,
        requests: rateData?.requests || 1,
        expires: rateData?.expires || requestTime + window * 1000,
        window,
        requestTime,
      });

      const shouldReturn = await store.checkAndSetRateLimitData(
        max,
        window,
        requestTime,
        identifierKey,
        rateData,
        message,
        statusCode,
        headersType,
        reply
      );

      if (shouldReturn) return;
    }
  );

  fastify.addHook("onResponse", async (request, reply) => {
    if (logger) logger.log(request, reply);

    const rateLimitData = await store.get(idKey);

    if (skipFailedRequests && reply.statusCode >= 400) {
      await store.set(idKey, {
        expires: rateLimitData?.expires as number,
        requests: (rateLimitData?.requests as number) - 1,
      });
    }
  });
}

export const fastifyRateLimiter = fastifyPlugin(rateLimitingMiddleware, {
  name: "fastifyRateLimiter",
});
