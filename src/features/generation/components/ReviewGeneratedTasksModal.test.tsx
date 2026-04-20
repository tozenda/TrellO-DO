import { Form } from "antd";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { ReviewGeneratedTasksModal } from "./ReviewGeneratedTasksModal";

function ReviewModalHarness({
  onSelectAll,
  onClear,
}: {
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue({
      suggestions: [
        {
          title: "Draft outline",
          details: "Create the documentation outline.",
          priority: "p1",
          notes: "Start from the current API spec.",
          selected: true,
        },
      ],
    });
  }, [form]);

  return (
    <ReviewGeneratedTasksModal
      form={form}
      initiative={{
        id: "initiative-1",
        name: "Docs",
        goal: "",
        createdAt: "2026-04-16T00:00:00.000Z",
        cards: [],
      }}
      isOpen={true}
      isGenerating={false}
      generatedSummary="Summary"
      reviewError=""
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
      onRegenerate={vi.fn()}
      onSelectAll={onSelectAll}
      onClear={onClear}
      onFinish={vi.fn()}
    />
  );
}

describe("ReviewGeneratedTasksModal", () => {
  it("renders the review list and exposes bulk actions", async () => {
    const user = userEvent.setup();
    const onSelectAll = vi.fn();
    const onClear = vi.fn();

    render(<ReviewModalHarness onSelectAll={onSelectAll} onClear={onClear} />);

    expect(await screen.findByRole("checkbox", { name: /include this task/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Select all" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(onSelectAll).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
