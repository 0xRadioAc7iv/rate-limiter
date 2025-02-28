# Rate Limiter 🚀

A lightweight and efficient rate-limiting library for Node.js, designed to help developers control API request rates and prevent abuse.

## Features

- ✅ In-memory, Redis & Mongo Support
- ✅ Dynamic Rate Limiting
- ✅ Supports Express, Fastify & NestJS (Coming Soon!)

## 🚀 Setup

### Installation

```bash
npm install @radioac7iv/rate-limiter
```

### Usage

Basic example using Express:

```typescript
import express from "express";
import { expressRateLimiter } from "@radioac7iv/rate-limiter";

const app = express();

const rateLimit = expressRateLimiter({
  limitOptions: () => {
    return { max: 5, window: 10 };
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

### 📖 Documentation

Detailed usage, configuration options, and examples are available in the official documentation:

[🔗 Read the Docs](https://rate-limiter.0xradioactiv.xyz/)

### 🤝 Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Clone your fork:

```bash
git clone https://github.com/0xRadioAc7iv/rate-limiter.git
```

3. Install dependencies:

```bash
npm install
```

4. Create a new branch:

```bash
git checkout -b feature-name
```

5. Make your changes & commit:

```bash
git commit -m "Add new feature"
```

6. Push & open a PR:

```bash
git push origin feature-name
```

### 📜 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
