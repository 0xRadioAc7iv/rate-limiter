import { constructHeaders } from "../src/utils/headers";

describe("headers", () => {
  it("returns legacy headers", () => {
    const legacyHeaders = constructHeaders("legacy", "100", "5", "30");

    expect(legacyHeaders.get("X-RateLimit-Limit")).toBe("100");
    expect(legacyHeaders.get("X-RateLimit-Remaining")).toBe("5");
    expect(legacyHeaders.get("X-RateLimit-Reset")).toBe("30");
  });

  it("returns draft-6 headers", () => {
    const draft6Headers = constructHeaders("draft-6", "100", "5", "30");

    expect(draft6Headers.get("RateLimit-Limit")).toBe("100");
    expect(draft6Headers.get("RateLimit-Remaining")).toBe("5");
    expect(draft6Headers.get("RateLimit-Reset")).toBe("30");
  });

  it("returns draft-7 headers", () => {
    const draft7Headers = constructHeaders("draft-7", "100", "5", "30");

    expect(draft7Headers.get("limit")).toBe("100");
    expect(draft7Headers.get("remaining")).toBe("5");
    expect(draft7Headers.get("reset")).toBe("30");
  });
});
