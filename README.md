# Rate Limiter

A highly configurable rate-limiting middleware for Express.js applications.

## Overview

The Rate Limiter is an open-source NPM package designed for managing request rates in Express.js applications. It helps prevent abuse and ensures fair usage of server resources through customizable rate-limiting logic.

## Features

- Highly configurable and flexible
- Supports in-memory and custom stores
- Automatic cleanup of expired rate data
- Customizable headers and response messages
- Optional logging for requests
- Seamless integration with Express.js

## Installation

```bash
npm i @radioac7iv/rate-limiter
```

## Usage

### Basic Example

```ts
import express from "express";
import { rateLimiter } from "@radioac7iv/rate-limiter";

const app = express();

const rateLimit = rateLimiter({
  key: (req, res) => req.ip as string,
  limitOptions: () => {
    return { max: 5, window: 10 };
  },
  standardHeaders: "draft-7",
  logs: {
    directory: "./logs",
  },
});

app.use(rateLimit);

app.get("/", (request, response) => {
  response.status(200).send({ message: "Hello!" });
});

app.listen(3000, () => {
  console.log("Server started at PORT: 3000");
});
```

## Configuration

The rate limiter can be configured using the following options:

| Option               | Type          | Description                                                                         | Default                  |
| -------------------- | ------------- | ----------------------------------------------------------------------------------- | ------------------------ |
| `key`                | string        | Unique key to identify each client (e.g., IP address).                              | None (required)          |
| `limitOptions`       | Array         | List of objects defining `limit` (maximum requests) and `window` (time in seconds). | None (required)          |
| `skip`               | Array<string> | Keys to skip from rate-limiting.                                                    | `[]`                     |
| `skipFailedRequests` | boolean       | Whether to exclude failed requests from rate limits.                                | `false`                  |
| `cleanUpInterval`    | number        | Interval (in seconds) for cleaning up expired rate data.                            | `30`                     |
| `message`            | string        | Custom message when the rate limit is exceeded.                                     | `"Rate limit exceeded."` |
| `statusCode`         | number        | HTTP status code to send when the rate limit is exceeded.                           | `429`                    |
| `legacyHeaders`      | boolean       | Whether to include legacy headers (e.g., `X-RateLimit-Limit`).                      | `true`                   |
| `standardHeaders`    | boolean       | Whether to include standard headers (e.g., `RateLimit-Limit`).                      | `false`                  |
| `logs`               | object        | Configuration for logging requests (e.g., directory).                               | `undefined`              |

## Contributing

Contributions are welcome! If you'd like to contribute:

- Fork the repository.
- Create a feature branch: `git checkout -b feature-name`.
- Commit your changes: `git commit -m "Add feature-name"`.
- Push to the branch: `git push origin feature-name`.
- Submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
