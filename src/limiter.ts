import { RequestHandler } from "express";

const rates = new Map<string, RateLimitData>();

const resetRates = () => {
  rates.clear();
};

export const rateLimiter = ({
  limit = 5,
  window = 60,
  message,
  statusCode = 429,
}: limiterOptions): RequestHandler => {
  setInterval(() => {
    resetRates();
  }, 1000 * window);

  return (request, response, next) => {
    const requestTime = Date.now();
    const ip = request.ip as string;
    const rateData = rates.get(ip);
    const { requests, lastRequest } = rateData
      ? rateData
      : { requests: 0, lastRequest: 0 };

    rates.set(ip, { requests: requests + 1, lastRequest: requestTime });

    if (requests > limit - 1) {
      const retryAfterTimeInSeconds = Math.ceil(
        (requestTime - lastRequest) / 1000
      );

      response.setHeader("Retry-After", retryAfterTimeInSeconds);
      response.status(statusCode).json({
        error: message
          ? message
          : `Rate limit exceeded. Try again in ${retryAfterTimeInSeconds} seconds.`,
      });
    } else {
      console.log(rates.get(ip));
      next();
    }
  };
};
