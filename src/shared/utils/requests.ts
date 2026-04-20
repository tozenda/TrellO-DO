export function getRequestErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "payload" in error &&
    typeof (error as { payload?: unknown }).payload === "object" &&
    (error as { payload?: { error?: string; detail?: string } }).payload
  ) {
    const payload = (error as { payload?: { error?: string; detail?: string } }).payload;
    if (payload?.error) {
      if (payload.detail && payload.detail !== payload.error) {
        return `${payload.error} ${payload.detail}`;
      }
      return payload.error;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "The request could not be completed.";
}
