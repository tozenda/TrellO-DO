import fs from "node:fs/promises";
import { DATA_DIR, DATA_FILE } from "../config";
import { createInitialState, normalizeState } from "../../src/shared/state/workspace";
import type { WorkspaceState } from "../../src/shared/types/workspace";

export interface WorkspaceStore {
  readWorkspace: () => Promise<WorkspaceState>;
  writeWorkspace: (workspace: WorkspaceState) => Promise<void>;
}

export function createWorkspaceStore(): WorkspaceStore {
  return {
    readWorkspace,
    writeWorkspace,
  };
}

async function readWorkspace() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return normalizeState(JSON.parse(raw) as WorkspaceState);
  } catch (error) {
    const maybeError = error as NodeJS.ErrnoException;
    if (maybeError.code !== "ENOENT") {
      console.warn("Failed to read workspace file, recreating it.", maybeError);
    }

    const initialState = createInitialState();
    await writeWorkspace(initialState);
    return initialState;
  }
}

async function writeWorkspace(workspace: WorkspaceState) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(workspace, null, 2));
  await fs.rename(tempFile, DATA_FILE);
}
