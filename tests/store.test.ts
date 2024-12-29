import { setClientStore } from "../src/utils/store";

describe("stores", () => {
  it("sets local map store as client store", () => {
    const store = setClientStore(60);

    expect(store).toBeInstanceOf(Map);
  });
});
