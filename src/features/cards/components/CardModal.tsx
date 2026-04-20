import { Form, Input, Modal, Select } from "antd";
import type { FormInstance, InputRef } from "antd";
import type { RefObject } from "react";
import { CARD_PRIORITIES } from "@/shared/constants/board";
import type { Initiative, PriorityId } from "@/shared/types/workspace";

interface CardModalProps {
  form: FormInstance<{ title: string; details?: string; notes?: string; priority: PriorityId }>;
  inputRef: RefObject<InputRef | null>;
  isOpen: boolean;
  isEditing: boolean;
  cardTargetInitiative?: Initiative;
  onCancel: () => void;
  onSubmit: () => void;
  onFinish: (values: { title: string; details?: string; notes?: string; priority: PriorityId }) => void;
}

export function CardModal({
  form,
  inputRef,
  isOpen,
  isEditing,
  cardTargetInitiative,
  onCancel,
  onSubmit,
  onFinish,
}: CardModalProps) {
  return (
    <Modal
      destroyOnHidden
      okText={isEditing ? "Save changes" : "Create card"}
      onCancel={onCancel}
      onOk={onSubmit}
      open={isOpen}
      title={
        isEditing
          ? "Edit card"
          : cardTargetInitiative
            ? `Create card for ${cardTargetInitiative.name}`
            : "Create card"
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          label="Card title"
          name="title"
          rules={[{ required: true, message: "Enter a card title" }]}
        >
          <Input ref={inputRef} maxLength={80} placeholder="Prepare stakeholder review" />
        </Form.Item>
        <Form.Item label="Details" name="details">
          <Input.TextArea
            maxLength={280}
            rows={4}
            placeholder="Capture the work unit clearly."
          />
        </Form.Item>
        <Form.Item initialValue="p2" label="Priority" name="priority">
          <Select
            options={CARD_PRIORITIES.map((priority) => ({
              label: `${priority.label} · ${priority.title}`,
              value: priority.id,
            }))}
          />
        </Form.Item>
        <Form.Item label="Notes" name="notes">
          <Input
            maxLength={120}
            placeholder="Dependencies, blockers, decisions, or useful context."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
