import { DownOutlined, EditOutlined, RightOutlined } from "@ant-design/icons";
import { Badge, Button, Card, Empty, Layout, Space, Tag, Typography } from "antd";
import { COLUMN_DEFS } from "@/shared/constants/board";
import type { ColumnId, Initiative, WorkCard as WorkCardModel } from "@/shared/types/workspace";
import { columnBadgeColor, compareCardsByPriority } from "@/shared/utils/board";
import { WorkCard } from "@/features/cards/components/WorkCard";

const { Content } = Layout;
const { Paragraph, Text, Title } = Typography;

interface BoardProps {
  initiatives: Initiative[];
  isLoadingState: boolean;
  totalCards: number;
  inProgressCards: number;
  doneCards: number;
  expandedInitiativeIds: string[];
  expandedNotesCardIds: string[];
  isAiTaskGenerationEnabled: boolean;
  onToggleInitiative: (initiativeId: string) => void;
  onGenerateTasks: (initiativeId: string) => void;
  onEditInitiative: (initiative: Initiative) => void;
  onDeleteInitiative: (initiativeId: string) => void;
  onAddCard: (initiativeId: string) => void;
  onEditCard: (initiativeId: string, card: WorkCardModel) => void;
  onDeleteCard: (initiativeId: string, cardId: string) => void;
  onToggleNotes: (cardId: string) => void;
  onCardDragStart: (cardId: string, sourceInitiativeId: string) => void;
  onCardDragEnd: () => void;
  onDrop: (targetInitiativeId: string, targetColumnId: ColumnId) => void;
}

export function Board({
  initiatives,
  isLoadingState,
  totalCards,
  inProgressCards,
  doneCards,
  expandedInitiativeIds,
  expandedNotesCardIds,
  isAiTaskGenerationEnabled,
  onToggleInitiative,
  onGenerateTasks,
  onEditInitiative,
  onDeleteInitiative,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onToggleNotes,
  onCardDragStart,
  onCardDragEnd,
  onDrop,
}: BoardProps) {
  return (
    <Content className="app-content">
      <Card
        className="board-card"
        title="Swimlane board"
        extra={
          <Space size={8} wrap>
            <Tag variant="filled" className="header-tag">
              {totalCards} cards
            </Tag>
            <Tag variant="filled" className="header-tag">
              {inProgressCards} in progress
            </Tag>
            <Tag variant="filled" color="success" className="header-tag">
              {doneCards} done
            </Tag>
          </Space>
        }
      >
        <div className="board-lanes">
          {initiatives.length === 0 ? (
            <Empty
              description={isLoadingState ? "Loading workspace..." : "No initiatives match the current filter."}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            initiatives.map((initiative) => {
              const laneDoneCount = initiative.cards.filter((card) => card.column === "done").length;
              const isExpanded = expandedInitiativeIds.includes(initiative.id);

              return (
                <section key={initiative.id} className={`swimlane${isExpanded ? " expanded" : " collapsed"}`}>
                  <div className="swimlane-toolbar">
                    <button
                      type="button"
                      className="swimlane-toggle"
                      onClick={() => onToggleInitiative(initiative.id)}
                    >
                      {isExpanded ? <DownOutlined /> : <RightOutlined />}
                    </button>

                    <div className="swimlane-header">
                      <div className="swimlane-title-block">
                        <div className="swimlane-title-row">
                          <Title level={4} className="swimlane-title">
                            {initiative.name}
                          </Title>
                        </div>
                        {isExpanded ? (
                          <Paragraph className="swimlane-copy">
                            {initiative.goal || "No initiative goal yet."}
                          </Paragraph>
                        ) : null}
                      </div>

                      <Space wrap className="swimlane-actions">
                        <Tag className="swimlane-meta-tag">{initiative.cards.length} cards</Tag>
                        <Tag className="swimlane-meta-tag">
                          {initiative.cards.filter((card) => card.column === "in-progress").length} in motion
                        </Tag>
                        <Tag color="success" className="swimlane-meta-tag">
                          {laneDoneCount} done
                        </Tag>
                        <Button icon={<EditOutlined />} onClick={() => onEditInitiative(initiative)}>
                          Edit
                        </Button>
                        <Button
                          disabled={!isAiTaskGenerationEnabled}
                          onClick={() => onGenerateTasks(initiative.id)}
                        >
                          Generate tasks
                        </Button>
                        <Button danger onClick={() => onDeleteInitiative(initiative.id)}>
                          Delete
                        </Button>
                        <Button type="primary" onClick={() => onAddCard(initiative.id)}>
                          Add card
                        </Button>
                      </Space>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="swimlane-body">
                      <div className="lane-grid">
                        {COLUMN_DEFS.map((column) => {
                          const cards = initiative.cards
                            .filter((card) => card.column === column.id)
                            .sort(compareCardsByPriority);

                          return (
                            <div
                              key={`${initiative.id}-${column.id}`}
                              className={`lane-column lane-column-${column.id}`}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => onDrop(initiative.id, column.id)}
                            >
                              <div className="lane-column-header">
                                <Space align="center" size={8}>
                                  <Badge color={columnBadgeColor(column.id)} />
                                  <Text strong>{column.title}</Text>
                                </Space>
                                <Tag>{cards.length}</Tag>
                              </div>

                              <div className="lane-column-body">
                                {cards.length === 0 ? (
                                  <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={`No cards in ${column.title.toLowerCase()}`}
                                  />
                                ) : (
                                  cards.map((card) => (
                                    <WorkCard
                                      key={card.id}
                                      card={card}
                                      notesExpanded={expandedNotesCardIds.includes(card.id)}
                                      onToggleNotes={() => onToggleNotes(card.id)}
                                      onEdit={() => onEditCard(initiative.id, card)}
                                      onDelete={() => onDeleteCard(initiative.id, card.id)}
                                      onDragStart={() => onCardDragStart(card.id, initiative.id)}
                                      onDragEnd={onCardDragEnd}
                                    />
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })
          )}
        </div>
      </Card>
    </Content>
  );
}
