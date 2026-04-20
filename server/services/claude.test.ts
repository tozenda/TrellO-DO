import { describe, expect, it } from "vitest";
import { mapClaudeCommandError, parseClaudeGenerationResponse } from "./claude";

describe("claude service", () => {
  it("parses structured_output before falling back to result", () => {
    const parsed = parseClaudeGenerationResponse(
      JSON.stringify({
        type: "result",
        is_error: false,
        result: "ignored prose",
        structured_output: {
          rawSummary: "Summary",
          suggestions: [
            {
              title: "Draft outline",
              details: "Create the first cut.",
              priority: "p1",
              notes: "Use the source spec.",
            },
          ],
        },
      }),
      "initiative-1",
    );

    expect(parsed.initiativeId).toBe("initiative-1");
    expect(parsed.suggestions).toHaveLength(1);
    expect(parsed.suggestions[0]?.title).toBe("Draft outline");
  });

  it("maps Claude login failures into a user-facing message", () => {
    const error = mapClaudeCommandError({
      stdout: JSON.stringify({
        result: "Not logged in. Run /login.",
      }),
      stderr: "",
    });

    expect(error.userMessage).toMatch(/not logged in/i);
  });
});
