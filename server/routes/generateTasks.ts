import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonBody, respondJson } from "../lib/http";
import { createUserError, isUserError } from "../lib/errors";
import { generateTasksWithClaude } from "../services/claude";
import type { WorkspaceStore } from "../services/workspaceStore";

interface GenerateTasksBody {
  initiativeId?: string;
  instructions?: string;
}

export async function handleGenerateTasksRequest(
  request: IncomingMessage,
  response: ServerResponse,
  workspaceStore: WorkspaceStore,
) {
  if (request.method !== "POST") {
    respondJson(response, 405, {
      error: "Method not allowed.",
    });
    return;
  }

  try {
    const body = await readJsonBody<GenerateTasksBody>(request);
    const workspace = await workspaceStore.readWorkspace();
    const initiative = workspace.initiatives.find((item) => item.id === body.initiativeId);

    if (!initiative) {
      throw createUserError(
        400,
        "Invalid initiative.",
        "The requested initiative does not exist.",
      );
    }

    const generation = await generateTasksWithClaude(workspace, initiative, body.instructions);
    respondJson(response, 200, generation);
  } catch (error) {
    if (isUserError(error)) {
      respondJson(response, error.statusCode, {
        error: error.userMessage,
        detail: error.message,
      });
      return;
    }

    respondJson(response, 500, {
      error: "Task generation failed.",
      detail: error instanceof Error ? error.message : "Unexpected error.",
    });
  }
}
