import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkCard } from "./WorkCard";

const baseCard = {
  id: "card-1",
  title: "Finalize launch timeline",
  details: "Confirm the milestones.",
  memory: "Need approval from marketing.",
  priority: "p1" as const,
  column: "backlog" as const,
  updatedAt: "2026-04-16T00:00:00.000Z",
};

describe("WorkCard", () => {
  it("hides notes when the card has no notes", () => {
    render(
      <WorkCard
        card={{ ...baseCard, memory: "" }}
        notesExpanded={false}
        onToggleNotes={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /notes/i })).not.toBeInTheDocument();
  });

  it("toggles notes when notes exist", async () => {
    const user = userEvent.setup();
    const onToggleNotes = vi.fn();

    render(
      <WorkCard
        card={baseCard}
        notesExpanded={false}
        onToggleNotes={onToggleNotes}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /notes/i }));

    expect(onToggleNotes).toHaveBeenCalledTimes(1);
  });
});
