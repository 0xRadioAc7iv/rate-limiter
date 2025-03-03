import fastifyPlugin from "fastify-plugin";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { limiterOptions } from "../lib/types";
import { RateLimiterMiddleware } from "../core/limiter";

declare module "fastify" {
  interface FastifyRequest {
    startTime?: bigint;
  }
}

async function rateLimitingMiddleware(
  fastify: FastifyInstance,
  options: limiterOptions
) {
  const limiter = new RateLimiterMiddleware(options);
  const identifierMap = new Map<string, string>();

  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { shouldBlock, identifierKey } = await limiter.processRequest(
          request,
          reply
        );

        identifierMap.set(request.id, identifierKey);

        if (shouldBlock) return;
      } catch (error) {
        request.log.error(error);
      }
    }
  );

  fastify.addHook("onResponse", async (request, reply) => {
    try {
      const identifierKey = identifierMap.get(request.id);

      if (identifierKey) {
        await limiter.handleResponse(identifierKey, reply.statusCode);
        identifierMap.delete(request.id);
      }
    } catch (error) {
      request.log.error(error);
    }
  });
}

export const fastifyRateLimiter = fastifyPlugin(rateLimitingMiddleware, {
  name: "fastifyRateLimiter",
});
