import { CARD_PRIORITIES, COLUMN_DEFS, DEFAULT_PRIORITY } from "../constants/board";
import type { ColumnId, PriorityId, WorkCard } from "../types/workspace";

export function normalizeColumn(columnId: string | undefined): ColumnId {
  if (columnId === "review") return "in-progress";
  return COLUMN_DEFS.some((column) => column.id === columnId)
    ? (columnId as ColumnId)
    : "backlog";
}

export function isValidPriority(priorityId: string | undefined): priorityId is PriorityId {
  return CARD_PRIORITIES.some((priority) => priority.id === priorityId);
}

export function getPriority(priorityId: PriorityId | string | undefined) {
  return CARD_PRIORITIES.find((priority) => priority.id === priorityId) ?? CARD_PRIORITIES[2];
}

export function getPriorityLabel(priorityId: PriorityId | string | undefined): string {
  const priority = getPriority(priorityId);
  return `${priority.label} ${priority.title}`;
}

export function getPriorityColor(priorityId: PriorityId | string | undefined): string {
  return getPriority(priorityId).color;
}

export function compareCardsByPriority(left: WorkCard, right: WorkCard): number {
  const rankDifference = getPriority(left.priority).rank - getPriority(right.priority).rank;
  if (rankDifference !== 0) return rankDifference;
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

export function getColumnTitle(columnId: ColumnId | string): string {
  return COLUMN_DEFS.find((column) => column.id === columnId)?.title ?? String(columnId);
}

export function columnBadgeColor(columnId: ColumnId): string {
  switch (columnId) {
    case "backlog":
      return "#597ef7";
    case "in-progress":
      return "#13c2c2";
    case "done":
      return "#8c8c8c";
    default:
      return "#d9d9d9";
  }
}

export function normalizePriority(priorityId: string | undefined): PriorityId {
  return isValidPriority(priorityId) ? priorityId : DEFAULT_PRIORITY;
}
