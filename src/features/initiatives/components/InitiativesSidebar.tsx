import { Badge, Button, Card, Col, Empty, Layout, Row, Space, Statistic, Switch, Tag, Typography } from "antd";
import type { MutableRefObject } from "react";
import type { ActivityEntry, Initiative } from "@/shared/types/workspace";
import { formatDateTime, formatShortDate } from "@/shared/utils/dates";

const { Sider } = Layout;
const { Text, Title, Paragraph } = Typography;

interface InitiativesSidebarProps {
  initiatives: Initiative[];
  activity: ActivityEntry[];
  activeInitiativeId: string;
  filterInitiativeId: string | null;
  isLoadingState: boolean;
  isDarkMode: boolean;
  saveError: string;
  totalCards: number;
  inProgressCards: number;
  doneCards: number;
  isAiTaskGenerationEnabled: boolean;
  aiTaskGenerationReason: string;
  onThemeChange: (value: boolean) => void;
  onGenerate: () => void;
  onNewInitiative: () => void;
  onFilterChange: (initiativeId: string | null) => void;
  onReorderInitiatives: (sourceInitiativeId: string, targetInitiativeId: string) => void;
  onReset: () => void;
  initiativeDragRef: MutableRefObject<string | null>;
}

export function InitiativesSidebar({
  initiatives,
  activity,
  activeInitiativeId,
  filterInitiativeId,
  isLoadingState,
  isDarkMode,
  saveError,
  totalCards,
  inProgressCards,
  doneCards,
  isAiTaskGenerationEnabled,
  aiTaskGenerationReason,
  onThemeChange,
  onGenerate,
  onNewInitiative,
  onFilterChange,
  onReorderInitiatives,
  onReset,
  initiativeDragRef,
}: InitiativesSidebarProps) {
  return (
    <Sider width={320} theme="light" className="app-sider">
      <div className="brand-block">
        <div className="brand-topbar">
          <Space size={8} wrap>
            <Tag color="blue">Work board</Tag>
            <Tag>{isDarkMode ? "Night" : "Day"}</Tag>
          </Space>
          <Space size={8}>
            <Text type="secondary" className="theme-toggle-label">
              Night mode
            </Text>
            <Switch checked={isDarkMode} onChange={onThemeChange} />
          </Space>
        </div>
        <Title level={3} className="brand-title">
          Trello-Do
        </Title>
        <Paragraph className="brand-copy">
          Initiative swimlanes with persistent context. The board is the primary working surface.
        </Paragraph>
        {saveError ? (
          <Text type="danger" className="brand-copy">
            {saveError}
          </Text>
        ) : null}
      </div>

      <Card
        size="small"
        title="Initiatives"
        extra={
          <Space size={4}>
            <Button
              type="text"
              disabled={!activeInitiativeId || isLoadingState || !isAiTaskGenerationEnabled}
              onClick={onGenerate}
            >
              Generate
            </Button>
            <Button type="text" onClick={onNewInitiative}>
              New
            </Button>
          </Space>
        }
        className="panel-card"
      >
        <button
          type="button"
          className={`initiative-button initiative-filter-button${filterInitiativeId === null ? " active" : ""}`}
          onClick={() => onFilterChange(null)}
        >
          <div className="initiative-button-row">
            <Text strong>All initiatives</Text>
            <Badge count={initiatives.length} color="#cfd4dc" style={{ color: "#101828" }} />
          </div>
          <Text type="secondary" className="initiative-goal-text">
            Show every swimlane on the board.
          </Text>
        </button>

        {initiatives.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No initiatives yet" />
        ) : (
          <div className="initiative-list">
            {initiatives.map((initiative) => {
              const doneCount = initiative.cards.filter((card) => card.column === "done").length;

              return (
                <div key={initiative.id} className="initiative-list-item">
                  <button
                    type="button"
                    draggable
                    className={`initiative-button${filterInitiativeId === initiative.id ? " active" : ""}`}
                    onClick={() => onFilterChange(initiative.id)}
                    onDragStart={() => {
                      initiativeDragRef.current = initiative.id;
                    }}
                    onDragEnd={() => {
                      initiativeDragRef.current = null;
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (initiativeDragRef.current) {
                        onReorderInitiatives(initiativeDragRef.current, initiative.id);
                      }
                      initiativeDragRef.current = null;
                    }}
                  >
                    <div className="initiative-button-row">
                      <Text strong>{initiative.name}</Text>
                      <Badge count={initiative.cards.length} color="#cfd4dc" style={{ color: "#101828" }} />
                    </div>
                    <Text type="secondary" className="initiative-goal-text">
                      {initiative.goal || "No initiative goal yet."}
                    </Text>
                    <div className="initiative-button-row initiative-foot">
                      <Space size={8} wrap>
                        <Text type="secondary">
                          {doneCount}/{Math.max(initiative.cards.length, 1)} shipped
                        </Text>
                        {initiative.id === activeInitiativeId ? (
                          <Tag color="blue" variant="filled">
                            Target
                          </Tag>
                        ) : null}
                      </Space>
                      <Text type="secondary">{formatShortDate(initiative.createdAt)}</Text>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!isAiTaskGenerationEnabled ? (
          <Text type="secondary" className="panel-inline-note">
            AI task generation is unavailable.
            {aiTaskGenerationReason ? ` ${aiTaskGenerationReason}` : ""}
          </Text>
        ) : null}
      </Card>

      <Card
        size="small"
        title="Memory"
        extra={
          <Button danger type="text" onClick={onReset}>
            Reset
          </Button>
        }
        className="panel-card"
      >
        <Row gutter={[12, 12]} className="memory-stats">
          <Col span={12}>
            <Statistic title="Initiatives" value={initiatives.length} />
          </Col>
          <Col span={12}>
            <Statistic title="Cards" value={totalCards} />
          </Col>
          <Col span={12}>
            <Statistic title="In Progress" value={inProgressCards} />
          </Col>
          <Col span={12}>
            <Statistic title="Done" value={doneCards} />
          </Col>
        </Row>
        {activity.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Memory feed is empty" />
        ) : (
          <div className="activity-list">
            {activity.map((entry) => (
              <div key={entry.id} className="activity-item">
                <div>
                  <Text strong>{entry.title}</Text>
                  <Paragraph className="activity-context">{entry.context}</Paragraph>
                  <Text type="secondary">{formatDateTime(entry.at)}</Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Sider>
  );
}
