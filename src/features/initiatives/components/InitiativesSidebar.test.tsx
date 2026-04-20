import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InitiativesSidebar } from "./InitiativesSidebar";
import type { Initiative } from "@/shared/types/workspace";

const initiatives: Initiative[] = [
  {
    id: "initiative-1",
    name: "Long initiative title that should still keep the actions visible and the layout intact",
    goal: "Ship the work cleanly.",
    createdAt: "2026-04-16T00:00:00.000Z",
    cards: [],
  },
];

describe("InitiativesSidebar", () => {
  it("filters initiatives from the left rail", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(
      <InitiativesSidebar
        initiatives={initiatives}
        activity={[]}
        activeInitiativeId="initiative-1"
        filterInitiativeId={null}
        isLoadingState={false}
        isDarkMode={false}
        saveError=""
        totalCards={0}
        inProgressCards={0}
        doneCards={0}
        isAiTaskGenerationEnabled={true}
        aiTaskGenerationReason=""
        onThemeChange={vi.fn()}
        onGenerate={vi.fn()}
        onNewInitiative={vi.fn()}
        onFilterChange={onFilterChange}
        onReorderInitiatives={vi.fn()}
        onReset={vi.fn()}
        initiativeDragRef={{ current: null }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /all initiatives/i }));
    await user.click(screen.getByRole("button", { name: /long initiative title/i }));

    expect(onFilterChange).toHaveBeenNthCalledWith(1, null);
    expect(onFilterChange).toHaveBeenNthCalledWith(2, "initiative-1");
  });

  it("disables AI generation when capability is unavailable", () => {
    render(
      <InitiativesSidebar
        initiatives={initiatives}
        activity={[]}
        activeInitiativeId=""
        filterInitiativeId={null}
        isLoadingState={false}
        isDarkMode={false}
        saveError=""
        totalCards={0}
        inProgressCards={0}
        doneCards={0}
        isAiTaskGenerationEnabled={false}
        aiTaskGenerationReason="Claude is unavailable."
        onThemeChange={vi.fn()}
        onGenerate={vi.fn()}
        onNewInitiative={vi.fn()}
        onFilterChange={vi.fn()}
        onReorderInitiatives={vi.fn()}
        onReset={vi.fn()}
        initiativeDragRef={{ current: null }}
      />,
    );

    const generateButtons = screen.getAllByRole("button", { name: "Generate" });
    expect(generateButtons[1]).toBeDisabled();
    expect(screen.getByText(/AI task generation is unavailable/i)).toBeInTheDocument();
  });
});
