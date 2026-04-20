import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import {
  CLAUDE_COMMAND,
  CLAUDE_DEBUG_LOG_FILE,
  CLAUDE_MAX_BUFFER_BYTES,
  CLAUDE_TASK_GENERATION_ENABLED,
  CLAUDE_TIMEOUT_MS,
  DATA_DIR,
  MAX_GENERATED_TASKS,
} from "../config";
import { createUserError } from "../lib/errors";
import { normalizePriority } from "../../src/shared/utils/board";
import type {
  GeneratedTaskSuggestion,
  Initiative,
  WorkspaceState,
} from "../../src/shared/types/workspace";

export interface GenerateTasksResult {
  initiativeId: string;
  suggestions: GeneratedTaskSuggestion[];
  rawSummary?: string;
}

export async function generateTasksWithClaude(
  workspace: WorkspaceState,
  initiative: Initiative,
  instructions: string | undefined,
): Promise<GenerateTasksResult> {
  if (!CLAUDE_TASK_GENERATION_ENABLED) {
    throw createUserError(
      503,
      "Task generation is disabled on this server.",
      "Set CLAUDE_TASK_GENERATION_ENABLED=true and install/authenticate Claude CLI on the server host to enable it.",
    );
  }

  const promptPayload = {
    task: "Break this initiative into actionable tasks for a personal work board.",
    guidance: (instructions || "").trim(),
    initiative: {
      id: initiative.id,
      name: initiative.name,
      goal: initiative.goal || "",
      existingCards: initiative.cards.map((card) => ({
        title: card.title,
        details: card.details || "",
        priority: card.priority || "p2",
        notes: card.memory || "",
        column: card.column,
      })),
    },
    board: {
      initiatives: workspace.initiatives.map((item) => ({
        name: item.name,
        goal: item.goal || "",
        cards: item.cards.map((card) => ({
          title: card.title,
          column: card.column,
          priority: card.priority || "p2",
        })),
      })),
      recentActivity: workspace.activity.slice(0, 10).map((entry) => ({
        title: entry.title,
        context: entry.context,
        at: entry.at,
      })),
    },
    rules: [
      "Return 4 to 12 tasks unless the initiative is extremely small.",
      "Avoid duplicates with existing cards in the target initiative.",
      "Prefer specific, implementable work items.",
      "Use priorities p0, p1, p2, or p3 only.",
      "Notes should be concise and only include dependencies, blockers, caveats, or useful context.",
      "Return JSON only.",
    ],
  };

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      suggestions: {
        type: "array",
        minItems: 1,
        maxItems: MAX_GENERATED_TASKS,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", minLength: 1, maxLength: 120 },
            details: { type: "string", maxLength: 400 },
            priority: { type: "string", enum: ["p0", "p1", "p2", "p3"] },
            notes: { type: "string", maxLength: 240 },
          },
          required: ["title", "details", "priority", "notes"],
        },
      },
      rawSummary: { type: "string", maxLength: 600 },
    },
    required: ["suggestions"],
  };

  const systemPrompt = [
    "You help break initiatives into concrete work cards.",
    "Do not duplicate existing cards in the target initiative.",
    "Return specific, non-overlapping tasks.",
    "Use p0, p1, p2, or p3 for priority.",
    "Return only JSON matching the provided schema.",
  ].join(" ");

  const commandArgs = [
    "-p",
    "--output-format",
    "json",
    "--input-format",
    "text",
    "--permission-mode",
    "bypassPermissions",
    "--json-schema",
    JSON.stringify(schema),
    "--system-prompt",
    systemPrompt,
    JSON.stringify(promptPayload, null, 2),
  ];

  const logContext = {
    command: CLAUDE_COMMAND,
    cwd: process.cwd(),
    timeoutMs: CLAUDE_TIMEOUT_MS,
    initiativeId: initiative.id,
    initiativeName: initiative.name,
    instructions: (instructions || "").trim(),
    systemPrompt,
    schema,
    promptPayload,
    commandArgs,
  };

  let commandResult: { stdout: string; stderr: string };
  const startedAt = Date.now();

  try {
    commandResult = await runClaudeCommand(CLAUDE_COMMAND, commandArgs, {
      cwd: process.cwd(),
      timeoutMs: CLAUDE_TIMEOUT_MS,
      maxBufferBytes: CLAUDE_MAX_BUFFER_BYTES,
    });
  } catch (error) {
    await appendClaudeDebugLog({
      ...logContext,
      status: "command_error",
      durationMs: Date.now() - startedAt,
      stdout: getErrorStream(error, "stdout"),
      stderr: getErrorStream(error, "stderr"),
      error: {
        message: (error as Error).message,
        code: getErrorProperty(error, "code"),
        signal: getErrorProperty(error, "signal"),
        killed: Boolean(getErrorProperty(error, "killed")),
      },
    });
    throw mapClaudeCommandError(error);
  }

  await appendClaudeDebugLog({
    ...logContext,
    status: "command_success",
    durationMs: Date.now() - startedAt,
    stdout: commandResult.stdout,
    stderr: commandResult.stderr,
  });

  try {
    return parseClaudeGenerationResponse(commandResult.stdout, initiative.id);
  } catch (error) {
    await appendClaudeDebugLog({
      ...logContext,
      status: "parse_error",
      durationMs: Date.now() - startedAt,
      stdout: commandResult.stdout,
      stderr: commandResult.stderr,
      error: {
        message: (error as Error).message,
        userMessage: getErrorProperty(error, "userMessage"),
        statusCode: getErrorProperty(error, "statusCode"),
      },
    });
    throw error;
  }
}

export function parseClaudeGenerationResponse(stdout: string, initiativeId: string): GenerateTasksResult {
  let envelope: any;

  try {
    envelope = JSON.parse(stdout);
  } catch {
    throw createUserError(
      502,
      "Generation failed.",
      "Claude returned output that could not be parsed.",
    );
  }

  if (envelope.is_error) {
    throw createUserError(
      502,
      deriveClaudeUserMessage(envelope.result),
      typeof envelope.result === "string" ? envelope.result : "Claude CLI reported an error.",
    );
  }

  let parsedResult = envelope.structured_output ?? envelope.result;
  if (!parsedResult) {
    throw createUserError(502, "Generation failed.", "Claude did not return structured output.");
  }

  if (typeof parsedResult === "string") {
    try {
      parsedResult = JSON.parse(parsedResult);
    } catch {
      throw createUserError(502, "Generation failed.", "Claude did not return valid JSON suggestions.");
    }
  }

  const suggestions = Array.isArray(parsedResult?.suggestions) ? parsedResult.suggestions : null;
  if (!suggestions) {
    throw createUserError(502, "Generation failed.", "Claude did not return a suggestions array.");
  }

  const normalizedSuggestions = suggestions
    .slice(0, MAX_GENERATED_TASKS)
    .map(normalizeSuggestion)
    .filter((suggestion: GeneratedTaskSuggestion | null): suggestion is GeneratedTaskSuggestion =>
      Boolean(suggestion),
    );

  if (normalizedSuggestions.length === 0) {
    throw createUserError(
      502,
      "Generation returned no tasks.",
      "Claude returned no usable task suggestions.",
    );
  }

  return {
    initiativeId,
    suggestions: normalizedSuggestions,
    rawSummary:
      typeof parsedResult.rawSummary === "string" && parsedResult.rawSummary.trim()
        ? parsedResult.rawSummary.trim()
        : undefined,
  };
}

export function mapClaudeCommandError(error: unknown) {
  const code = getErrorProperty(error, "code");
  const signal = getErrorProperty(error, "signal");
  const killed = Boolean(getErrorProperty(error, "killed"));
  const stdout = getErrorStream(error, "stdout");
  const stderr = getErrorStream(error, "stderr");

  if (code === "ENOENT") {
    return createUserError(
      500,
      "Claude CLI is not installed.",
      `Could not find the '${CLAUDE_COMMAND}' command on this machine.`,
    );
  }

  if (killed || signal === "SIGTERM") {
    return createUserError(
      504,
      "Generation timed out.",
      `Claude did not finish within ${CLAUDE_TIMEOUT_MS}ms.`,
    );
  }

  const combined = [stdout, stderr].filter(Boolean).join("\n").trim();

  try {
    const parsed = stdout ? JSON.parse(stdout) : null;
    if (parsed?.result) {
      return createUserError(
        502,
        deriveClaudeUserMessage(parsed.result),
        typeof parsed.result === "string" ? parsed.result : combined || (error as Error).message,
      );
    }
  } catch {
    // Ignore JSON parsing failure and fall through to the generic error.
  }

  return createUserError(
    502,
    "Generation failed.",
    combined || (error as Error).message || "Claude CLI exited with an error.",
  );
}

function normalizeSuggestion(suggestion: unknown): GeneratedTaskSuggestion | null {
  if (!suggestion || typeof suggestion !== "object") return null;

  const candidate = suggestion as Record<string, unknown>;
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  if (!title) return null;

  return {
    title,
    details: typeof candidate.details === "string" ? candidate.details.trim() : "",
    priority: normalizePriority(
      typeof candidate.priority === "string" ? candidate.priority : undefined,
    ) as GeneratedTaskSuggestion["priority"],
    notes: typeof candidate.notes === "string" ? candidate.notes.trim() : "",
  };
}

function deriveClaudeUserMessage(result: unknown) {
  const message = typeof result === "string" ? result : "";
  if (/not logged in|\/login/i.test(message)) {
    return "Claude CLI is not logged in. Run claude and complete /login on this machine.";
  }
  return "Task generation failed.";
}

function runClaudeCommand(
  command: string,
  args: string[],
  options: { cwd: string; timeoutMs: number; maxBufferBytes: number },
) {
  const { cwd, timeoutMs, maxBufferBytes } = options;

  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const finalizeError = (error: NodeJS.ErrnoException & { stdout?: string; stderr?: string; killed?: boolean }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    };

    const finalizeSuccess = (result: { stdout: string; stderr: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(result);
    };

    const killForOverflow = (streamName: "stdout" | "stderr") => {
      const error = new Error(`Claude CLI ${streamName} exceeded ${maxBufferBytes} bytes.`) as NodeJS.ErrnoException & {
        stdout?: string;
        stderr?: string;
        killed?: boolean;
      };
      error.code = "MAX_BUFFER";
      error.killed = true;
      child.kill("SIGTERM");
      finalizeError(error);
    };

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (stdout.length > maxBufferBytes) {
        killForOverflow("stdout");
      }
    });

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      if (stderr.length > maxBufferBytes) {
        killForOverflow("stderr");
      }
    });

    child.on("error", (error) => {
      finalizeError(error);
    });

    child.on("close", (code, signal) => {
      if (settled) return;

      if (code === 0) {
        finalizeSuccess({ stdout, stderr });
        return;
      }

      const error = new Error(
        `Command failed: ${command} ${args.join(" ")}${stderr ? `\n${stderr}` : ""}`,
      ) as NodeJS.ErrnoException & { stdout?: string; stderr?: string; killed?: boolean; signal?: NodeJS.Signals | null };
      error.code = code === null ? undefined : String(code);
      error.signal = signal;
      error.killed = timedOut || signal === "SIGTERM";
      finalizeError(error);
    });

    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);
  });
}

async function appendClaudeDebugLog(entry: unknown) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const logEntry = `${JSON.stringify({ at: new Date().toISOString(), ...((entry as object) || {}) }, null, 2)}\n\n`;
  await fs.appendFile(CLAUDE_DEBUG_LOG_FILE, logEntry, "utf8");
}

function getErrorStream(error: unknown, key: "stdout" | "stderr") {
  const value = getErrorProperty(error, key);
  return typeof value === "string" ? value : "";
}

function getErrorProperty(error: unknown, key: string) {
  if (!error || typeof error !== "object") return undefined;
  return (error as Record<string, unknown>)[key];
}
