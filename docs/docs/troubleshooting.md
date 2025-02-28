---
sidebar_position: 5
title: Troubleshooting
---

### Rate Limiting Not Working

**Possible Causes:**

- Middleware is not applied correctly.
- Incorrect configuration settings.
- The storage backend (Redis, database) is not connected.

**Solution:**

- Ensure the middleware is placed before your route handlers.
- Check the rate-limiting configuration.
- Verify the storage backend connection.

### Requests Not Being Throttled

**Possible Causes:**

- The configured rate limits are too high.
- Client requests might be coming from different IPs (e.g., behind a proxy).

**Solution:**

- Reduce the rate limit values and test again.
- Ensure you correctly extract the client's IP when behind a proxy.

### Redis Errors

**Possible Causes:**

- Redis server is not running.
- Incorrect Redis connection settings.

**Solution:**

- Start the Redis server (`redis-server`).
- Double-check the Redis host, port, and authentication credentials.

### Memory Usage is Too High

**Possible Causes:**

- In-memory storage is used with high traffic.
- Old keys are not expiring in Redis.

**Solution:**

- Use a more scalable storage backend like Redis.
- Set proper TTL (Time-To-Live) for stored keys.
