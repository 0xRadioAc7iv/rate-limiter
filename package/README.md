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
import { expressRateLimiter } from "@radioac7iv/rate-limiter";

const app = express();

const rateLimit = expressRateLimiter({
  key: (req, res) => req.ip as string,
  limitOptions: () => {
    return { max: 5, window: 10 };
  },
  headersType: "draft-7",
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

| Option             | Type                  | Description                                                                                 | Default             |
| ------------------ | --------------------- | ------------------------------------------------------------------------------------------- | ------------------- |
| key                | function              | Unique key to identify each client (e.g., IP address or an API Key).                        | Client's IP address |
| skip               | string[]              | Keys to skip from rate-limiting.                                                            | `[]`                |
| skipFailedRequests | boolean               | Whether to exclude failed requests from rate limits.                                        | `false`             |
| message            | string                | Custom message when the rate limit is exceeded.                                             | Rate limit exceeded |
| statusCode         | number                | HTTP status code to send when the rate limit is exceeded.                                   | `429`               |
| headersType        | HeadersType           | Choose between "legacy", "draft-6", "draft-7" or "draft-8"                                  | `legacy`            |
| logs               | object                | Configuration for logging requests                                                          | `undefined`         |
| limitOptions       | object                | Function returning Object defining `max` (maximum requests) and `window` (time in seconds). | None (required)     |
| storeType          | StoreType             | Choose between "memory", "redis" or "mongodb"                                               | `memory`            |
| externalStore      | RedisClientType \| Db | External store instance for storing rate-limiting data.                                     | `undefined`         |
