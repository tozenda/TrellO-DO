export async function requestJson<TResponse, TBody = unknown>(
  url: string,
  method: string,
  body?: TBody,
): Promise<TResponse> {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const requestError = new Error(
      typeof payload === "object" &&
        payload !== null &&
        ("detail" in payload || "error" in payload)
        ? String(
            (payload as { detail?: string; error?: string }).detail ||
              (payload as { detail?: string; error?: string }).error,
          )
        : `Request failed with status ${response.status}`,
    ) as Error & { status?: number; payload?: unknown };
    requestError.status = response.status;
    requestError.payload = payload;
    throw requestError;
  }

  return response.json() as Promise<TResponse>;
}
