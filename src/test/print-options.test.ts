import { describe, expect, it } from "vitest";
import { pageSizeForPaper } from "@/lib/printOptions";

describe("pageSizeForPaper", () => {
  it("uses A4 for the A4 paper choice", () => {
    expect(pageSizeForPaper("a4")).toBe("A4");
  });

  it("uses Letter for the Letter paper choice", () => {
    expect(pageSizeForPaper("letter")).toBe("Letter");
  });
});
