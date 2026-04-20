import {
  AI_GENERATE_TASKS_ENDPOINT,
  CAPABILITIES_ENDPOINT,
  WORKSPACE_ENDPOINT,
} from "../constants/app";
import type {
  CapabilitiesResponse,
  GeneratedTaskSuggestion,
  TaskGenerationRequest,
  WorkspaceState,
} from "../types/workspace";
import { requestJson } from "./http";

export interface GenerateTasksResponse {
  initiativeId: string;
  suggestions: GeneratedTaskSuggestion[];
  rawSummary?: string;
}

export function requestWorkspace(method: "GET" | "PUT", body?: WorkspaceState) {
  return requestJson<WorkspaceState, WorkspaceState | undefined>(WORKSPACE_ENDPOINT, method, body);
}

export function requestCapabilities() {
  return requestJson<CapabilitiesResponse>(CAPABILITIES_ENDPOINT, "GET");
}

export function requestTaskGeneration(body: Pick<TaskGenerationRequest, "initiativeId" | "instructions">) {
  return requestJson<GenerateTasksResponse, Pick<TaskGenerationRequest, "initiativeId" | "instructions">>(
    AI_GENERATE_TASKS_ENDPOINT,
    "POST",
    body,
  );
}
