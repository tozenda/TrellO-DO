import type { AddressInfo } from "node:net";
import { HOST, PORT } from "./config";
import { createApp } from "./http/app";
import { createWorkspaceStore } from "./services/workspaceStore";

export async function start() {
  const workspaceStore = createWorkspaceStore();
  await workspaceStore.readWorkspace();

  const server = await createApp(workspaceStore);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, HOST, () => resolve());
  });

  const address = server.address();
  const boundPort = address && typeof address === "object" ? (address as AddressInfo).port : PORT;
  const url = `http://${HOST}:${boundPort}`;

  console.log(`Trello-Do running at ${url}`);

  return {
    server,
    host: HOST,
    port: boundPort,
    url,
  };
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Failed to start local server.", error);
    process.exitCode = 1;
  });
}
