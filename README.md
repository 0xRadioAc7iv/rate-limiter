# Rate Limiter

## Overview

An NPM Package for Rate limiting middleware for Express applications.

## Features

- Configurable limits
- Easy integration

## Installation

Clone the repository:

```bash
git clone https://github.com/0xRadioAc7iv/rate-limiter.git
cd rate-limiter
```

## Usage

```javascript
import { rateLimiter } from "rate-limiter";

const rateLimit = rateLimiter({ limit: 5, window: 10 });

app.use(rateLimit);
```

### Basic Example

```javascript
import express from "express";
import { rateLimiter } from "rate-limiter";

const app = express();

const rateLimit = rateLimiter({ limit: 5, window: 10 });

app.use(rateLimit);

app.get("/", (request, response) => {
  response.status(200).send({ message: "It works!" });
});

app.listen(3000, () => {
  console.log("Server started at PORT:3000");
});
```

## Configuration

- `limit` Number of allowed requests in the specified window. Default is 5.
- `window` Time Interval (in seconds) for which the rate limiter will track requests. Default is 60.
- `cleanUpInterval` Time Interval (in seconds) to cleanup stale rate data. Default is 30.
- `message` Message to send when rate limit is hit.
- `status` Status code to send when rate limit is hit. Default is 429.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
