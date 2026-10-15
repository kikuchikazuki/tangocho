import { describe, expect, it } from "vitest";
import { nextProgress } from "./progress";
describe("nextProgress", () =>
  it("cycles through four states", () =>
    expect(
      [0, 1, 2, 3].map((value) => nextProgress(value as 0 | 1 | 2 | 3)),
    ).toEqual([1, 2, 3, 0])));
