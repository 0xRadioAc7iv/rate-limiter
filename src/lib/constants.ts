/**
 * @constant {number} DEFAULT_RATE_LIMIT
 * The default number of requests allowed per window. Defaults to 100.
 */
export const DEFAULT_RATE_LIMIT = 100;

/**
 * @constant {number} DEFAULT_RATE_WINDOW
 * The default time window (in seconds) for the rate limiter. Defaults to 60 seconds.
 */
export const DEFAULT_RATE_WINDOW = 60;

/**
 * @constant {number} DEFAULT_CLEANUP_INTERVAL
 * The interval (in seconds) at which expired keys are cleaned up. Defaults to 30 seconds.
 */
export const DEFAULT_CLEANUP_INTERVAL = 30;

/**
 * @constant {number} DEFAULT_STATUS_CODE
 * The HTTP status code returned when a client exceeds the rate limit. Defaults to 429 (Too Many Requests).
 */
export const DEFAULT_STATUS_CODE = 429;

/**
 * @constant {boolean} DEFAULT_SKIP_FAILED_REQUESTS
 * Indicates whether failed requests should be excluded from the rate limit count. Defaults to false.
 */
export const DEFAULT_SKIP_FAILED_REQUESTS = false;

/**
 * @constant {string[]} DEFAULT_KEY_SKIP_LIST
 * A list of keys that should be excluded from rate limiting. Defaults to an empty array.
 */
export const DEFAULT_KEY_SKIP_LIST = Array<string>();

/**
 * @constant {boolean} DEFAULT_LEGACY_HEADERS
 * Indicates whether to include legacy X-RateLimit headers in the response. Defaults to true.
 */
export const DEFAULT_LEGACY_HEADERS = true;
