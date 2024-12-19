import { RequestHandler } from "express";

const rates = new Map<string, RateLimitData>();

export const rateLimiter = ({
  limit = DEFAULT_RATE_LIMIT,
  window = DEFAULT_RATE_WINDOW,
  cleanUpInterval = DEFAULT_CLEANUP_INTERVAL,
  message,
  statusCode = DEFAULT_STATUS_CODE,
}: limiterOptions): RequestHandler => {
  setInterval(() => {
    const now = Date.now();

    for (const [ip, rateData] of rates) {
      if (rateData.requests == 0 || now > rateData.expires) {
        rates.delete(ip);
      }
    }
  }, 1000 * cleanUpInterval);

  return (request, response, next) => {
    const requestTime = Date.now();
    const ip = request.ip as string;
    const rateData = rates.get(ip);

    if (!rateData) {
      rates.set(ip, {
        requests: 1,
        expires: requestTime + window * 1000,
      });
    } else {
      if (requestTime >= rateData.expires) {
        rates.set(ip, {
          requests: 1,
          expires: requestTime + window * 1000,
        });
      } else {
        if (rateData.requests > limit - 1) {
          const timeLeft = Math.ceil((rateData.expires - requestTime) / 1000);

          response.setHeader("Retry-After", timeLeft);
          response.status(statusCode).json({
            error: message
              ? message
              : `Rate limit exceeded. Try again in ${timeLeft} seconds.`,
          });

          return;
        }

        rates.set(ip, { ...rateData, requests: rateData.requests + 1 });
      }
    }

    next();
  };
};
