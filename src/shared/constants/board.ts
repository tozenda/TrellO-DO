import type { CardPriorityMeta, ColumnDefinition, PriorityId } from "../types/workspace";

export const COLUMN_DEFS: ColumnDefinition[] = [
  { id: "backlog", title: "Backlog", color: "blue" },
  { id: "in-progress", title: "In Progress", color: "cyan" },
  { id: "done", title: "Done", color: "default" },
];

export const CARD_PRIORITIES: CardPriorityMeta[] = [
  { id: "p0", label: "P0", title: "Critical", color: "red", rank: 0 },
  { id: "p1", label: "P1", title: "High", color: "volcano", rank: 1 },
  { id: "p2", label: "P2", title: "Medium", color: "gold", rank: 2 },
  { id: "p3", label: "P3", title: "Low", color: "default", rank: 3 },
];

export const DEFAULT_PRIORITY: PriorityId = "p2";
