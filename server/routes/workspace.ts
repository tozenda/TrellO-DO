import type { IncomingMessage, ServerResponse } from "node:http";
import { normalizeState } from "../../src/shared/state/workspace";
import type { WorkspaceState } from "../../src/shared/types/workspace";
import { readJsonBody, respondJson } from "../lib/http";
import type { WorkspaceStore } from "../services/workspaceStore";

export async function handleWorkspaceRequest(
  request: IncomingMessage,
  response: ServerResponse,
  workspaceStore: WorkspaceStore,
) {
  if (request.method === "GET") {
    const workspace = await workspaceStore.readWorkspace();
    respondJson(response, 200, workspace);
    return;
  }

  if (request.method === "PUT") {
    const body = await readJsonBody<WorkspaceState>(request);
    const workspace = normalizeState(body);
    await workspaceStore.writeWorkspace(workspace);
    respondJson(response, 200, workspace);
    return;
  }

  respondJson(response, 405, {
    error: "Method not allowed.",
  });
}
