export type ColumnId = "backlog" | "in-progress" | "done";
export type PriorityId = "p0" | "p1" | "p2" | "p3";

export interface WorkCard {
  id: string;
  title: string;
  details: string;
  memory: string;
  priority: PriorityId;
  column: ColumnId;
  updatedAt: string;
}

export interface Initiative {
  id: string;
  name: string;
  goal: string;
  createdAt: string;
  cards: WorkCard[];
}

export interface ActivityEntry {
  id: string;
  title: string;
  context: string;
  at: string;
}

export interface WorkspaceState {
  activeInitiativeId: string;
  initiatives: Initiative[];
  activity: ActivityEntry[];
}

export interface ClaudeCapability {
  enabled: boolean;
  reason: string;
}

export interface CapabilitiesResponse {
  aiTaskGeneration: ClaudeCapability;
}

export interface GeneratedTaskSuggestion {
  title: string;
  details: string;
  priority: PriorityId;
  notes: string;
  selected?: boolean;
}

export interface TaskGenerationRequest {
  initiativeId: string;
  instructions: string;
  priorityOverride: PriorityId | "";
}

export interface CardPriorityMeta {
  id: PriorityId;
  label: string;
  title: string;
  color: string;
  rank: number;
}

export interface ColumnDefinition {
  id: ColumnId;
  title: string;
  color: string;
}
