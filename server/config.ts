import path from "node:path";

export const APP_ROOT = process.env.APP_ROOT_DIR || process.cwd();
export const HOST = process.env.HOST || "127.0.0.1";
export const PORT = Number.parseInt(process.env.PORT || "3000", 10);
export const NODE_ENV = process.env.NODE_ENV || "development";
export const IS_PRODUCTION = NODE_ENV === "production";
export const DATA_DIR = process.env.APP_DATA_DIR || path.join(APP_ROOT, "data");
export const DATA_FILE = path.join(DATA_DIR, "workspace.json");
export const CLAUDE_DEBUG_LOG_FILE = path.join(DATA_DIR, "claude-debug.log");
export const CLAUDE_COMMAND = process.env.CLAUDE_BIN || "claude";
export const CLAUDE_TASK_GENERATION_ENABLED = process.env.CLAUDE_TASK_GENERATION_ENABLED !== "false";
export const CLAUDE_TIMEOUT_MS = Number.parseInt(process.env.CLAUDE_TIMEOUT_MS || "180000", 10);
export const CLAUDE_MAX_BUFFER_BYTES = 1024 * 1024 * 4;
export const MAX_GENERATED_TASKS = 12;
export const DIST_DIR = path.join(APP_ROOT, "dist");
export const INDEX_FILE = path.join(DIST_DIR, "index.html");
