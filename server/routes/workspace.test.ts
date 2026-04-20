import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { handleWorkspaceRequest } from "./workspace";
import { handleCapabilitiesRequest } from "./capabilities";

function createResponseRecorder() {
  const state = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: "",
  };

  return {
    response: {
      writeHead: vi.fn((statusCode: number, headers: Record<string, string>) => {
        state.statusCode = statusCode;
        state.headers = headers;
      }),
      end: vi.fn((body: string) => {
        state.body = body;
      }),
    },
    state,
  };
}

function createRequest(method: string, body?: unknown) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  const request = Readable.from(payload ? [payload] : []);
  return Object.assign(request, { method });
}

describe("workspace routes", () => {
  it("returns the workspace on GET", async () => {
    const { response, state } = createResponseRecorder();
    const workspace = {
      activeInitiativeId: "initiative-1",
      initiatives: [],
      activity: [],
    };

    await handleWorkspaceRequest(
      createRequest("GET") as never,
      response as never,
      {
        readWorkspace: vi.fn().mockResolvedValue(workspace),
        writeWorkspace: vi.fn(),
      },
    );

    expect(state.statusCode).toBe(200);
    expect(JSON.parse(state.body)).toEqual(workspace);
  });

  it("normalizes and persists the workspace on PUT", async () => {
    const { response, state } = createResponseRecorder();
    const writeWorkspace = vi.fn();

    await handleWorkspaceRequest(
      createRequest("PUT", {
        activeInitiativeId: "initiative-1",
        initiatives: [
          {
            id: "initiative-1",
            name: "Docs",
            goal: "",
            createdAt: "2026-04-16T00:00:00.000Z",
            cards: [
              {
                id: "card-1",
                title: "Legacy",
                details: "",
                memory: "",
                priority: "oops",
                column: "review",
                updatedAt: "2026-04-16T00:00:00.000Z",
              },
            ],
          },
        ],
        activity: [],
      }) as never,
      response as never,
      {
        readWorkspace: vi.fn(),
        writeWorkspace,
      },
    );

    const saved = writeWorkspace.mock.calls[0]?.[0];
    expect(saved.initiatives[0].cards[0].column).toBe("in-progress");
    expect(saved.initiatives[0].cards[0].priority).toBe("p2");
    expect(state.statusCode).toBe(200);
  });

  it("returns capabilities", async () => {
    const { response, state } = createResponseRecorder();

    await handleCapabilitiesRequest(response as never);

    expect(state.statusCode).toBe(200);
    expect(JSON.parse(state.body)).toHaveProperty("aiTaskGeneration");
  });
});
