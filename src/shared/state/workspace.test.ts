import { describe, expect, it } from "vitest";
import {
  createCard,
  createEmptyState,
  createInitiative,
  importGeneratedTasks,
  moveCard,
  normalizeState,
  reorderInitiatives,
} from "./workspace";

describe("workspace state", () => {
  it("normalizes legacy review cards and invalid priority values", () => {
    const state = normalizeState({
      activeInitiativeId: "initiative-1",
      initiatives: [
        {
          id: "initiative-1",
          name: "Initiative",
          goal: "",
          createdAt: "2026-04-16T00:00:00.000Z",
          cards: [
            {
              id: "card-1",
              title: "Legacy card",
              details: "",
              memory: "",
              priority: "bad" as never,
              column: "review" as never,
              updatedAt: "2026-04-16T00:00:00.000Z",
            },
          ],
        },
      ],
      activity: [],
    });

    expect(state.initiatives[0]?.cards[0]?.column).toBe("in-progress");
    expect(state.initiatives[0]?.cards[0]?.priority).toBe("p2");
  });

  it("reorders initiatives and records activity", () => {
    const first = createInitiative(createEmptyState(), { name: "First" });
    const second = createInitiative(first, { name: "Second" });
    const reordered = reorderInitiatives(
      second,
      second.initiatives[1]!.id,
      second.initiatives[0]!.id,
    );

    expect(reordered.initiatives[0]?.name).toBe("First");
    expect(reordered.activity[0]?.title).toContain("Reordered initiative");
  });

  it("moves cards across initiatives and celebrates completion", () => {
    const withSource = createInitiative(createEmptyState(), { name: "Source" });
    const withTarget = createInitiative(withSource, { name: "Target" });
    const sourceId = withTarget.initiatives[1]!.id;
    const targetId = withTarget.initiatives[0]!.id;
    const withCard = createCard(withTarget, sourceId, {
      title: "Ship it",
      details: "Move to done",
      priority: "p1",
    });
    const cardId = withCard.initiatives[1]!.cards[0]!.id;

    const result = moveCard(withCard, sourceId, cardId, targetId, "done");

    expect(result.celebrate).toBe(true);
    expect(result.state.initiatives[0]!.cards[0]!.column).toBe("done");
  });

  it("imports generated tasks into backlog", () => {
    const state = createInitiative(createEmptyState(), { name: "AI lane" });
    const initiativeId = state.initiatives[0]!.id;
    const imported = importGeneratedTasks(
      state,
      initiativeId,
      [
        {
          title: "Draft outline",
          details: "Create the outline",
          priority: "p1",
          notes: "Start with endpoints",
        },
      ],
      "Generated from Claude",
    );

    expect(imported.initiatives[0]!.cards[0]!.column).toBe("backlog");
    expect(imported.activity[0]!.title).toContain("Imported 1 generated task");
  });
});
