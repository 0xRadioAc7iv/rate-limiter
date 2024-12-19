type limiterOptions = {
  limit: number; // Request limit per IP
  window: number; // Allowed 'limit' number of requests in 'window' seconds.
  message?: string; // Message to send on hitting the Rate limit
  statusCode?: number;
};

type RateLimitData = {
  requests: number;
  lastRequest: number;
};
