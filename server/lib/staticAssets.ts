import fs from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer as createViteServer } from "vite";
import { DIST_DIR, HOST, INDEX_FILE, IS_PRODUCTION } from "../config";
import { respondJson } from "./http";

export type FrontendHandler = (
  request: IncomingMessage,
  response: ServerResponse,
  requestUrl: URL,
) => Promise<void>;

export async function createFrontendHandler(): Promise<FrontendHandler> {
  if (!IS_PRODUCTION) {
    const vite = await createViteServer({
      appType: "spa",
      server: {
        host: HOST,
        middlewareMode: true,
      },
    });

    return async (request, response) =>
      new Promise((resolve) => {
        vite.middlewares(request, response, (error?: Error) => {
          if (error) {
            vite.ssrFixStacktrace(error);
            respondJson(response, 500, {
              error: "Vite middleware failed.",
              detail: error.message,
            });
          }
          resolve();
        });
      });
  }

  try {
    await fs.access(INDEX_FILE);
  } catch {
    throw new Error(
      "Production assets are missing. Run `npm run build` before starting the server in production.",
    );
  }

  return async (_request, response, requestUrl) => {
    const assetPath = resolveAssetPath(requestUrl.pathname);
    if (assetPath) {
      const served = await tryServeStaticFile(response, assetPath);
      if (served) return;
    }

    await respondFile(response, INDEX_FILE, "text/html; charset=utf-8");
  };
}

function resolveAssetPath(pathname: string) {
  const normalizedPath = pathname === "/" ? "" : pathname.replace(/^\/+/, "");
  if (!normalizedPath) return null;

  const candidatePath = path.join(DIST_DIR, normalizedPath);
  const relativePath = path.relative(DIST_DIR, candidatePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  return candidatePath;
}

async function tryServeStaticFile(response: ServerResponse, filePath: string) {
  try {
    const fileStat = await fs.stat(filePath);
    if (!fileStat.isFile()) {
      return false;
    }

    await respondFile(response, filePath, getContentType(filePath));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function respondFile(response: ServerResponse, filePath: string, contentType: string) {
  const fileBuffer = await fs.readFile(filePath);
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": contentType.startsWith("text/html")
      ? "no-store"
      : "public, max-age=31536000, immutable",
  });
  response.end(fileBuffer);
}

function getContentType(filePath: string) {
  switch (path.extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}
