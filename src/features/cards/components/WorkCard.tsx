import { DeleteOutlined, DownOutlined, EditOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Card, Space, Tag, Typography } from "antd";
import type { WorkCard as WorkCardModel } from "@/shared/types/workspace";
import { getPriorityColor, getPriorityLabel } from "@/shared/utils/board";

const { Paragraph, Text } = Typography;

interface WorkCardProps {
  card: WorkCardModel;
  notesExpanded: boolean;
  onToggleNotes: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function WorkCard({
  card,
  notesExpanded,
  onToggleNotes,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
}: WorkCardProps) {
  return (
    <Card
      size="small"
      className="work-card"
      draggable
      onClick={onEdit}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="work-card-top">
        <div className="work-card-title-block">
          <Text strong className="work-card-title">
            {card.title}
          </Text>
          <Space wrap size={[8, 8]} className="work-card-meta">
            <Tag
              color={getPriorityColor(card.priority)}
              variant="filled"
              className="work-card-priority"
            >
              {getPriorityLabel(card.priority)}
            </Tag>
          </Space>
        </div>

        <div className="work-card-actions">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            className="work-card-edit"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          />
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            className="work-card-delete"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          />
        </div>
      </div>

      <div className="work-card-section">
        <Text className="work-card-label">Details</Text>
        <Paragraph className={`work-card-copy${card.details ? "" : " is-placeholder"}`}>
          {card.details || "No details added yet."}
        </Paragraph>
      </div>

      {card.memory ? (
        <div className="work-card-notes">
          <button
            type="button"
            className="work-card-notes-toggle"
            onClick={(event) => {
              event.stopPropagation();
              onToggleNotes();
            }}
          >
            <Text className="work-card-label">Notes</Text>
            {notesExpanded ? <DownOutlined /> : <RightOutlined />}
          </button>
          {notesExpanded ? <Paragraph className="work-card-notes-copy">{card.memory}</Paragraph> : null}
        </div>
      ) : null}
    </Card>
  );
}
