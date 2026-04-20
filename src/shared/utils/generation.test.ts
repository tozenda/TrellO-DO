import { describe, expect, it } from "vitest";
import { normalizeGeneratedSuggestion } from "./generation";

describe("normalizeGeneratedSuggestion", () => {
  it("truncates long text and respects a priority override", () => {
    const suggestion = normalizeGeneratedSuggestion(
      {
        title: "x".repeat(140),
        details: "d".repeat(500),
        priority: "p3",
        notes: "n".repeat(300),
      },
      {
        priorityOverride: "p0",
        selected: true,
      },
    );

    expect(suggestion?.title).toHaveLength(120);
    expect(suggestion?.details).toHaveLength(400);
    expect(suggestion?.notes).toHaveLength(240);
    expect(suggestion?.priority).toBe("p0");
    expect(suggestion?.selected).toBe(true);
  });

  it("rejects suggestions without a usable title", () => {
    expect(normalizeGeneratedSuggestion({ title: "   " })).toBeNull();
  });
});
