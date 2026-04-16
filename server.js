const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");

const HOST = "127.0.0.1";
const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "workspace.json");
const CLAUDE_DEBUG_LOG_FILE = path.join(DATA_DIR, "claude-debug.log");
const CLAUDE_COMMAND = process.env.CLAUDE_BIN || "claude";
const CLAUDE_TIMEOUT_MS = Number.parseInt(process.env.CLAUDE_TIMEOUT_MS || "180000", 10);
const CLAUDE_MAX_BUFFER_BYTES = 1024 * 1024 * 4;
const MAX_GENERATED_TASKS = 12;

start().catch((error) => {
  console.error("Failed to start local server.", error);
  process.exitCode = 1;
});

async function start() {
  await readWorkspace();

  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    appType: "spa",
    server: {
      host: HOST,
      middlewareMode: true,
    },
  });

  const server = http.createServer(async (request, response) => {
    try {
      if (request.url === "/api/workspace") {
        await handleWorkspaceRequest(request, response);
        return;
      }

      if (request.url === "/api/ai/generate-tasks") {
        await handleGenerateTasksRequest(request, response);
        return;
      }

      vite.middlewares(request, response, (error) => {
        if (error) {
          vite.ssrFixStacktrace(error);
          respondJson(response, 500, {
            error: "Vite middleware failed.",
            detail: error.message,
          });
        }
      });
    } catch (error) {
      respondJson(response, 500, {
        error: "Unexpected server error.",
        detail: error.message,
      });
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`Trello-Do running at http://${HOST}:${PORT}`);
  });
}

async function handleWorkspaceRequest(request, response) {
  if (request.method === "GET") {
    const workspace = await readWorkspace();
    respondJson(response, 200, workspace);
    return;
  }

  if (request.method === "PUT") {
    const body = await readJsonBody(request);
    const workspace = normalizeState(body);
    await writeWorkspace(workspace);
    respondJson(response, 200, workspace);
    return;
  }

  respondJson(response, 405, {
    error: "Method not allowed.",
  });
}

async function handleGenerateTasksRequest(request, response) {
  if (request.method !== "POST") {
    respondJson(response, 405, {
      error: "Method not allowed.",
    });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const workspace = await readWorkspace();
    const initiative = workspace.initiatives.find(
      (item) => item.id === body.initiativeId,
    );

    if (!initiative) {
      respondJson(response, 400, {
        error: "Invalid initiative.",
        detail: "The requested initiative does not exist.",
      });
      return;
    }

    const generation = await generateTasksWithClaude(workspace, initiative, body.instructions);
    respondJson(response, 200, generation);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    respondJson(response, statusCode, {
      error: error.userMessage || "Task generation failed.",
      detail: error.message,
    });
  }
}

async function readWorkspace() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Failed to read workspace file, recreating it.", error);
    }

    const initialState = createInitialState();
    await writeWorkspace(initialState);
    return initialState;
  }
}

async function writeWorkspace(workspace) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(workspace, null, 2));
  await fs.rename(tempFile, DATA_FILE);
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function respondJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function generateTasksWithClaude(workspace, initiative, instructions) {
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

  let commandResult;
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
      stdout: typeof error.stdout === "string" ? error.stdout : "",
      stderr: typeof error.stderr === "string" ? error.stderr : "",
      error: {
        message: error.message,
        code: error.code,
        signal: error.signal,
        killed: error.killed,
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
        message: error.message,
        userMessage: error.userMessage,
        statusCode: error.statusCode,
      },
    });
    throw error;
  }
}

function parseClaudeGenerationResponse(stdout, initiativeId) {
  let envelope;

  try {
    envelope = JSON.parse(stdout);
  } catch (error) {
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
      typeof envelope.result === "string"
        ? envelope.result
        : "Claude CLI reported an error.",
    );
  }

  let parsedResult = envelope.structured_output ?? envelope.result;
  if (!parsedResult) {
    throw createUserError(
      502,
      "Generation failed.",
      "Claude did not return structured output.",
    );
  }

  if (typeof parsedResult === "string") {
    try {
      parsedResult = JSON.parse(parsedResult);
    } catch (error) {
      throw createUserError(
        502,
        "Generation failed.",
        "Claude did not return valid JSON suggestions.",
      );
    }
  }

  const suggestions = Array.isArray(parsedResult?.suggestions)
    ? parsedResult.suggestions
    : null;
  if (!suggestions) {
    throw createUserError(
      502,
      "Generation failed.",
      "Claude did not return a suggestions array.",
    );
  }

  const normalizedSuggestions = suggestions
    .slice(0, MAX_GENERATED_TASKS)
    .map(normalizeSuggestion)
    .filter(Boolean);

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

function normalizeSuggestion(suggestion) {
  if (!suggestion || typeof suggestion !== "object") return null;
  const title = typeof suggestion.title === "string" ? suggestion.title.trim() : "";
  if (!title) return null;

  return {
    title,
    details:
      typeof suggestion.details === "string" ? suggestion.details.trim() : "",
    priority: isValidPriority(suggestion.priority) ? suggestion.priority : "p2",
    notes: typeof suggestion.notes === "string" ? suggestion.notes.trim() : "",
  };
}

function mapClaudeCommandError(error) {
  if (error.code === "ENOENT") {
    return createUserError(
      500,
      "Claude CLI is not installed.",
      `Could not find the '${CLAUDE_COMMAND}' command on this machine.`,
    );
  }

  if (error.killed || error.signal === "SIGTERM") {
    return createUserError(
      504,
      "Generation timed out.",
      `Claude did not finish within ${CLAUDE_TIMEOUT_MS}ms.`,
    );
  }

  const stdout = typeof error.stdout === "string" ? error.stdout : "";
  const stderr = typeof error.stderr === "string" ? error.stderr : "";
  const combined = [stdout, stderr].filter(Boolean).join("\n").trim();

  try {
    const parsed = stdout ? JSON.parse(stdout) : null;
    if (parsed?.result) {
      return createUserError(
        502,
        deriveClaudeUserMessage(parsed.result),
        typeof parsed.result === "string" ? parsed.result : combined || error.message,
      );
    }
  } catch (parseError) {
    // Ignore parse failure and fall through to generic error.
  }

  return createUserError(
    502,
    "Generation failed.",
    combined || error.message || "Claude CLI exited with an error.",
  );
}

function deriveClaudeUserMessage(result) {
  const message = typeof result === "string" ? result : "";
  if (/not logged in|\/login/i.test(message)) {
    return "Claude CLI is not logged in. Run claude and complete /login on this machine.";
  }
  return "Task generation failed.";
}

function createUserError(statusCode, userMessage, detail) {
  const error = new Error(detail);
  error.statusCode = statusCode;
  error.userMessage = userMessage;
  return error;
}

function runClaudeCommand(command, args, options) {
  const { cwd, timeoutMs, maxBufferBytes } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const finalizeError = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    };

    const finalizeSuccess = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(result);
    };

    const killForOverflow = (streamName) => {
      const error = new Error(`Claude CLI ${streamName} exceeded ${maxBufferBytes} bytes.`);
      error.code = "MAX_BUFFER";
      error.killed = true;
      child.kill("SIGTERM");
      finalizeError(error);
    };

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.length > maxBufferBytes) {
        killForOverflow("stdout");
      }
    });

    child.stderr.on("data", (chunk) => {
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
      );
      error.code = code;
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

async function appendClaudeDebugLog(entry) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const logEntry = `${JSON.stringify(
    {
      at: new Date().toISOString(),
      ...entry,
    },
    null,
    2,
  )}\n\n`;
  await fs.appendFile(CLAUDE_DEBUG_LOG_FILE, logEntry, "utf8");
}

function createInitialState() {
  const launchId = createId("initiative");
  const onboardingId = createId("initiative");
  const now = new Date().toISOString();

  return {
    activeInitiativeId: launchId,
    initiatives: [
      {
        id: launchId,
        name: "Platform rollout",
        goal: "Coordinate the release path, tighten risk visibility, and keep decision context attached to the work.",
        createdAt: now,
        cards: [
          {
            id: createId("card"),
            title: "Finalize launch timeline",
            details: "Confirm milestone owners, review dependencies, and publish the release path.",
            memory: "Marketing sign-off is required before the public date is committed.",
            priority: "p1",
            column: "in-progress",
            updatedAt: now,
          },
          {
            id: createId("card"),
            title: "Approve support briefing",
            details: "Align response templates, escalation routes, and rollout messaging.",
            memory: "Support wants final screenshots from product before publishing.",
            priority: "p1",
            column: "in-progress",
            updatedAt: now,
          },
          {
            id: createId("card"),
            title: "Run payment regression",
            details: "Execute checkout coverage with production-like scenarios.",
            memory: "Last issue came from coupon handling on mobile Safari.",
            priority: "p0",
            column: "backlog",
            updatedAt: now,
          },
        ],
      },
      {
        id: onboardingId,
        name: "Onboarding refresh",
        goal: "Increase early activation by simplifying the first-session path and reducing ambiguity.",
        createdAt: now,
        cards: [
          {
            id: createId("card"),
            title: "Instrument activation funnel",
            details: "Capture first project, first invite, and first completed workflow.",
            memory: "Metrics need to be in place before content changes ship.",
            priority: "p1",
            column: "backlog",
            updatedAt: now,
          },
          {
            id: createId("card"),
            title: "Rewrite empty states",
            details: "Replace generic copy with direct next actions tailored to role.",
            memory: "Tone should be factual and directive.",
            priority: "p2",
            column: "in-progress",
            updatedAt: now,
          },
          {
            id: createId("card"),
            title: "Prototype checklist reveal",
            details: "Test staged task exposure after workspace creation.",
            memory: "",
            priority: "p3",
            column: "done",
            updatedAt: now,
          },
        ],
      },
    ],
    activity: [
      {
        id: createId("memory"),
        title: "Loaded workspace",
        context: "Seeded two initiatives so the swimlane board is immediately usable.",
        at: now,
      },
    ],
  };
}

function normalizeState(state) {
  return {
    activeInitiativeId:
      typeof state?.activeInitiativeId === "string"
        ? state.activeInitiativeId
        : "",
    initiatives: Array.isArray(state?.initiatives)
      ? state.initiatives.map((initiative) => ({
          ...initiative,
          cards: Array.isArray(initiative.cards)
            ? initiative.cards.map((card) => ({
                ...card,
                priority: isValidPriority(card.priority) ? card.priority : "p2",
                column: normalizeColumn(card.column),
              }))
            : [],
        }))
      : [],
    activity: Array.isArray(state?.activity) ? state.activity : [],
  };
}

function normalizeColumn(columnId) {
  if (columnId === "review") return "in-progress";
  return ["backlog", "in-progress", "done"].includes(columnId)
    ? columnId
    : "backlog";
}

function isValidPriority(priorityId) {
  return ["p0", "p1", "p2", "p3"].includes(priorityId);
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
