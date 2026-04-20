import http from "node:http";
import { HOST, NODE_ENV, PORT } from "../config";
import { respondJson } from "../lib/http";
import { createFrontendHandler } from "../lib/staticAssets";
import { handleCapabilitiesRequest } from "../routes/capabilities";
import { handleGenerateTasksRequest } from "../routes/generateTasks";
import { handleWorkspaceRequest } from "../routes/workspace";
import type { WorkspaceStore } from "../services/workspaceStore";

export async function createApp(workspaceStore: WorkspaceStore) {
  const frontendHandler = await createFrontendHandler();

  return http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", `http://${request.headers.host || `${HOST}:${PORT}`}`);

      if (requestUrl.pathname === "/health") {
        respondJson(response, 200, {
          status: "ok",
          environment: NODE_ENV,
        });
        return;
      }

      if (requestUrl.pathname === "/api/workspace") {
        await handleWorkspaceRequest(request, response, workspaceStore);
        return;
      }

      if (requestUrl.pathname === "/api/capabilities") {
        await handleCapabilitiesRequest(response);
        return;
      }

      if (requestUrl.pathname === "/api/ai/generate-tasks") {
        await handleGenerateTasksRequest(request, response, workspaceStore);
        return;
      }

      await frontendHandler(request, response, requestUrl);
    } catch (error) {
      respondJson(response, 500, {
        error: "Unexpected server error.",
        detail: error instanceof Error ? error.message : "Unknown error.",
      });
    }
  });
}
