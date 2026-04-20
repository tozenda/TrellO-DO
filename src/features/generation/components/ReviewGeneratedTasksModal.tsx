import { Alert, Button, Card, Checkbox, Empty, Form, Input, Modal, Select, Typography } from "antd";
import type { FormInstance } from "antd";
import { CARD_PRIORITIES } from "@/shared/constants/board";
import type { GeneratedTaskSuggestion, Initiative } from "@/shared/types/workspace";

const { Text } = Typography;

interface ReviewGeneratedTasksModalProps {
  form: FormInstance<{ suggestions: GeneratedTaskSuggestion[] }>;
  initiative?: Initiative;
  isOpen: boolean;
  isGenerating: boolean;
  generatedSummary: string;
  reviewError: string;
  onCancel: () => void;
  onSubmit: () => void;
  onRegenerate: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onFinish: (values: { suggestions?: GeneratedTaskSuggestion[] }) => void;
}

export function ReviewGeneratedTasksModal({
  form,
  initiative,
  isOpen,
  isGenerating,
  generatedSummary,
  reviewError,
  onCancel,
  onSubmit,
  onRegenerate,
  onSelectAll,
  onClear,
  onFinish,
}: ReviewGeneratedTasksModalProps) {
  return (
    <Modal
      destroyOnHidden
      confirmLoading={isGenerating}
      footer={[
        <Button key="regenerate" onClick={onRegenerate} loading={isGenerating}>
          Regenerate
        </Button>,
        <Button key="select-all" onClick={onSelectAll}>
          Select all
        </Button>,
        <Button key="clear" onClick={onClear}>
          Clear
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={onSubmit}>
          Add selected tasks
        </Button>,
      ]}
      width={920}
      onCancel={onCancel}
      open={isOpen}
      title={initiative ? `Review generated tasks for ${initiative.name}` : "Review generated tasks"}
    >
      {generatedSummary ? (
        <Alert
          showIcon
          type="info"
          title="Claude summary"
          description={generatedSummary}
          style={{ marginBottom: 16 }}
        />
      ) : null}
      {reviewError ? (
        <Alert
          showIcon
          type="error"
          title="Cannot import tasks"
          description={reviewError}
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.List name="suggestions">
          {(fields, { remove }) => (
            <div className="generated-task-list">
              <div className="generated-task-toolbar">
                <Text type="secondary">
                  {fields.length} suggestion{fields.length === 1 ? "" : "s"} ready for review.
                </Text>
              </div>
              {fields.length === 0 ? (
                <Empty
                  description="No suggested tasks to import."
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    className="generated-task-card"
                    extra={
                      <Button type="text" danger onClick={() => remove(field.name)}>
                        Remove
                      </Button>
                    }
                  >
                    <Form.Item
                      className="generated-task-checkbox"
                      name={[field.name, "selected"]}
                      valuePropName="checked"
                    >
                      <Checkbox>Include this task</Checkbox>
                    </Form.Item>
                    <Form.Item
                      label="Title"
                      name={[field.name, "title"]}
                      rules={[{ required: true, message: "Enter a task title" }]}
                    >
                      <Input maxLength={120} />
                    </Form.Item>
                    <Form.Item label="Details" name={[field.name, "details"]}>
                      <Input.TextArea maxLength={400} rows={3} />
                    </Form.Item>
                    <Form.Item label="Priority" name={[field.name, "priority"]}>
                      <Select
                        options={CARD_PRIORITIES.map((priority) => ({
                          label: `${priority.label} · ${priority.title}`,
                          value: priority.id,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item label="Notes" name={[field.name, "notes"]}>
                      <Input.TextArea maxLength={240} rows={2} />
                    </Form.Item>
                  </Card>
                ))
              )}
            </div>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
