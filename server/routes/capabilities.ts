import type { ServerResponse } from "node:http";
import { respondJson } from "../lib/http";
import { getClaudeCapability } from "../services/capabilities";

export async function handleCapabilitiesRequest(response: ServerResponse) {
  const claudeCapability = await getClaudeCapability();
  respondJson(response, 200, {
    aiTaskGeneration: claudeCapability,
  });
}
