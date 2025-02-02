/**
 * @file constants.ts
 * @description Default configuration constants for rate limiting.
 */

/** Default maximum allowed requests */
export const DEFAULT_RATE_LIMIT = 100;

/** Default time window for rate limiting (in seconds) */
export const DEFAULT_RATE_WINDOW = 60;

/** Default status code for rate-limited responses */
export const DEFAULT_STATUS_CODE = 429;

/** Default setting for skipping failed requests */
export const DEFAULT_SKIP_FAILED_REQUESTS = false;
