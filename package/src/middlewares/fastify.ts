import fastifyPlugin from "fastify-plugin";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { limiterOptions } from "../lib/types";
import { RateLimiterMiddleware } from "../core/limiter";
import { createHeaderConstructor } from "../utils";

declare module "fastify" {
  interface FastifyRequest {
    /**
     * Optional property to track request start time.
     * @type {bigint | undefined}
     */
    startTime?: bigint;
  }
}

/**
 * Middleware function to apply rate limiting in Fastify.
 * @param {FastifyInstance} fastify - The Fastify server instance.
 * @param {limiterOptions} options - Configuration options for the rate limiter.
 * @returns {Promise<void>} - Resolves when middleware is registered.
 */
async function rateLimitingMiddleware(
  fastify: FastifyInstance,
  options: limiterOptions
) {
  const headerConstructor = createHeaderConstructor(
    options.headersType || "legacy"
  );
  const limiter = new RateLimiterMiddleware(options, headerConstructor);
  const identifierMap = new Map<string, string>();

  fastify.addHook(
    "onRequest",
    /**
     * Hook to process incoming requests and apply rate limiting.
     * @param {FastifyRequest} request - The incoming request object.
     * @param {FastifyReply} reply - The outgoing response object.
     * @returns {Promise<void>} - Resolves when processing is complete.
     */
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

  fastify.addHook(
    "onResponse",
    /**
     * Hook to update rate limiting data after the response is sent.
     * @param {FastifyRequest} request - The handled request object.
     * @param {FastifyReply} reply - The sent response object.
     * @returns {Promise<void>} - Resolves after rate limiting data is updated.
     */
    async (request, reply) => {
      try {
        const identifierKey = identifierMap.get(request.id);

        if (identifierKey) {
          await limiter.handleResponse(identifierKey, reply.statusCode);
          identifierMap.delete(request.id);
        }
      } catch (error) {
        request.log.error(error);
      }
    }
  );
}

/**
 * Fastify rate limiter plugin.
 * @type {import("fastify").FastifyPluginCallback}
 */
export const fastifyRateLimiter = fastifyPlugin(rateLimitingMiddleware, {
  name: "fastifyRateLimiter",
});
