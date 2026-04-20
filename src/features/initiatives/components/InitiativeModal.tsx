import { Form, Input, Modal } from "antd";
import type { FormInstance, InputRef } from "antd";
import type { RefObject } from "react";

interface InitiativeModalProps {
  form: FormInstance<{ name: string; goal?: string }>;
  inputRef: RefObject<InputRef | null>;
  isOpen: boolean;
  isEditing: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  onFinish: (values: { name: string; goal?: string }) => void;
}

export function InitiativeModal({
  form,
  inputRef,
  isOpen,
  isEditing,
  onCancel,
  onSubmit,
  onFinish,
}: InitiativeModalProps) {
  return (
    <Modal
      destroyOnHidden
      okText={isEditing ? "Save changes" : "Save initiative"}
      onCancel={onCancel}
      onOk={onSubmit}
      open={isOpen}
      title={isEditing ? "Edit initiative" : "Create initiative"}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          label="Initiative name"
          name="name"
          rules={[{ required: true, message: "Enter an initiative name" }]}
        >
          <Input ref={inputRef} maxLength={60} placeholder="Quarterly planning" />
        </Form.Item>
        <Form.Item label="Goal" name="goal">
          <Input.TextArea
            maxLength={220}
            rows={4}
            placeholder="State the outcome this initiative should produce."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
