type limiterOptions = {
  limit: number; // Request limit per IP
  window: number; // Allowed 'limit' number of requests in 'window' seconds.
  message?: string; // Message to send on hitting the Rate limit
  statusCode?: number; // Status code to send on hitting the Rate limit
  cleanUpInterval?: number; // Interval to cleanup the rate data
};

type RateLimitData = {
  requests: number;
  expires: number;
};
