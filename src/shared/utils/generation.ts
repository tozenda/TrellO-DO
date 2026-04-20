import { DEFAULT_PRIORITY } from "../constants/board";
import type { GeneratedTaskSuggestion, PriorityId } from "../types/workspace";
import { isValidPriority } from "./board";
import { clampText } from "./text";

export function normalizeGeneratedSuggestion(
  suggestion: Partial<GeneratedTaskSuggestion> | null | undefined,
  options: { priorityOverride?: PriorityId | ""; selected?: boolean } = {},
): GeneratedTaskSuggestion | null {
  if (!suggestion || typeof suggestion !== "object") return null;

  const title = clampText(suggestion.title, 120);
  if (!title) return null;

  return {
    title,
    details: clampText(suggestion.details, 400),
    priority: isValidPriority(options.priorityOverride)
      ? options.priorityOverride
      : isValidPriority(suggestion.priority)
        ? suggestion.priority
        : DEFAULT_PRIORITY,
    notes: clampText(suggestion.notes, 240),
    selected: options.selected ?? suggestion.selected !== false,
  };
}
