import { describe, expect, it } from "vitest";
import { parseCards } from "./parser";
describe("parseCards", () => {
  it("parses valid rows and skips invalid rows", () => {
    expect(parseCards("A = B\n\ninvalid\nC = D = E\n = empty")).toEqual([
      { left: "A", right: "B" },
      { left: "C", right: "D = E" },
    ]);
  });
});
