import { DEFAULT_LEGACY_HEADERS } from "../lib/constants";
import { RateLimitHeadersArgs } from "../types";

export const setRateLimitHeaders = ({
  res,
  legacyHeaders = DEFAULT_LEGACY_HEADERS,
  standardHeaders,
  limit,
  requests,
  expires,
  window,
  requestTime,
}: RateLimitHeadersArgs) => {
  const limitValue = limit.toString();
  const remainingValue = (limit - requests).toString();
  const resetTime = Math.abs(Math.ceil((expires - requestTime) / 1000))
    .toString()
    .toString();

  if (standardHeaders) {
    legacyHeaders = false;
    res.setHeader("RateLimit-Policy", `${limit};w=${window}`);

    if (standardHeaders === "draft-6") {
      res.setHeader("RateLimit-Limit", limitValue);
      res.setHeader("RateLimit-Remaining", remainingValue);
      res.setHeader("RateLimit-Reset", resetTime);
    }

    if (standardHeaders === "draft-7") {
      res.setHeader("limit", limitValue);
      res.setHeader("remaining", remainingValue);
      res.setHeader("reset", resetTime);
    }

    return;
  }

  if (legacyHeaders) {
    res.setHeader("X-RateLimit-Limit", limitValue);
    res.setHeader("X-RateLimit-Remaining", remainingValue);
    res.setHeader("X-RateLimit-Reset", resetTime);
  }
};
