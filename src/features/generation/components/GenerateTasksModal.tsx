import { Alert, Form, Input, Modal, Select } from "antd";
import type { FormInstance } from "antd";
import { CARD_PRIORITIES } from "@/shared/constants/board";
import type { Initiative, PriorityId } from "@/shared/types/workspace";

interface GenerateTasksModalProps {
  form: FormInstance<{ instructions?: string; priorityOverride?: PriorityId | "" }>;
  initiative?: Initiative;
  isOpen: boolean;
  isGenerating: boolean;
  isEnabled: boolean;
  reason: string;
  error: string;
  onCancel: () => void;
  onSubmit: () => void;
  onFinish: (values: { instructions?: string; priorityOverride?: PriorityId | "" }) => void;
}

export function GenerateTasksModal({
  form,
  initiative,
  isOpen,
  isGenerating,
  isEnabled,
  reason,
  error,
  onCancel,
  onSubmit,
  onFinish,
}: GenerateTasksModalProps) {
  return (
    <Modal
      destroyOnHidden
      confirmLoading={isGenerating}
      okText="Generate tasks"
      onCancel={onCancel}
      onOk={onSubmit}
      open={isOpen}
      title={initiative ? `Generate tasks for ${initiative.name}` : "Generate tasks"}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        {!isEnabled ? (
          <Alert
            showIcon
            type="warning"
            title="Task generation is unavailable"
            description={reason || "AI task generation is disabled on this deployment."}
            style={{ marginBottom: 16 }}
          />
        ) : null}
        {error ? (
          <Alert
            showIcon
            type="error"
            title="Generation failed"
            description={error}
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Form.Item label="Guidance" name="instructions">
          <Input.TextArea
            maxLength={500}
            rows={5}
            placeholder="Optional: mention constraints, sequencing, expected output, or areas that matter most."
          />
        </Form.Item>
        <Form.Item initialValue="" label="Priority target" name="priorityOverride">
          <Select
            options={[
              { label: "Keep Claude priorities", value: "" },
              ...CARD_PRIORITIES.map((priority) => ({
                label: `${priority.label} · ${priority.title}`,
                value: priority.id,
              })),
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
