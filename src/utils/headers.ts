import { DEFAULT_LEGACY_HEADERS } from "../lib/constants";
import { RateLimitHeadersArgs } from "../types";

export const setRateLimitHeaders = ({
  res,
  legacyHeaders = DEFAULT_LEGACY_HEADERS,
  limit,
  requests,
  expires,
}: RateLimitHeadersArgs) => {
  if (legacyHeaders) {
    res.setHeader("X-RateLimit-Limit", limit.toString());
    res.setHeader("X-RateLimit-Remaining", (limit - requests).toString());
    res.setHeader("X-RateLimit-Reset", expires.toString());
  }
};
