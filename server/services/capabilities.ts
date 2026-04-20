import { CLAUDE_TASK_GENERATION_ENABLED } from "../config";
import type { ClaudeCapability } from "../../src/shared/types/workspace";

export async function getClaudeCapability(): Promise<ClaudeCapability> {
  if (!CLAUDE_TASK_GENERATION_ENABLED) {
    return {
      enabled: false,
      reason:
        "Disabled by server configuration. Enable CLAUDE_TASK_GENERATION_ENABLED and provide a working Claude CLI session on the host.",
    };
  }

  return {
    enabled: true,
    reason: "",
  };
}
