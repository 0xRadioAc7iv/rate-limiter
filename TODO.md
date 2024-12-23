- [x] Basic Rate limiting
- [x] Support for multiple types of user keys (for rate limit identification)
- [x] Redis support (External store) (Takes a big performance hit though)
- [x] Add Rate-limit Headers
  - [x] Standard Headers
    - [x] draft-6
    - [x] draft-7
  - [x] Legacy Headers (true by default)
- [x] skip (Function to determine whether or not this request counts towards a client's quota)
- [x] skipFailedRequests (when true, failed requests (statusCode >= 400) aren't counted)
- [x] store logs (local txt files)
- [x] Dynamic limits (custom function)
- [ ] Write Tests
- [ ] Compare performance with express-rate-limit
- [x] Refactor code
- [x] JSDOC Documentation
- [x] Update & Improve [README.md](README.md)
- [x] Publish to NPM

## Fix Issues

- [x] Main Rate Limit Headers being sent when rate limit is reached
- [x] Set Expiry on Redis data
