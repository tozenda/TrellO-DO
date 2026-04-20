import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Board } from "./Board";
import type { Initiative } from "@/shared/types/workspace";

const initiatives: Initiative[] = [
  {
    id: "initiative-1",
    name: "Write documentation for ETH Staking B2B API with an intentionally long title to exercise the swimlane header",
    goal: "Keep actions readable.",
    createdAt: "2026-04-16T00:00:00.000Z",
    cards: [],
  },
];

describe("Board", () => {
  it("renders long initiative titles without dropping the action controls", () => {
    render(
      <Board
        initiatives={initiatives}
        isLoadingState={false}
        totalCards={0}
        inProgressCards={0}
        doneCards={0}
        expandedInitiativeIds={["initiative-1"]}
        expandedNotesCardIds={[]}
        isAiTaskGenerationEnabled={true}
        onToggleInitiative={vi.fn()}
        onGenerateTasks={vi.fn()}
        onEditInitiative={vi.fn()}
        onDeleteInitiative={vi.fn()}
        onAddCard={vi.fn()}
        onEditCard={vi.fn()}
        onDeleteCard={vi.fn()}
        onToggleNotes={vi.fn()}
        onCardDragStart={vi.fn()}
        onCardDragEnd={vi.fn()}
        onDrop={vi.fn()}
      />,
    );

    expect(screen.getByText(/Write documentation for ETH Staking B2B API/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate tasks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add card" })).toBeInTheDocument();
  });
});
