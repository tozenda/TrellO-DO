import { DEFAULT_PRIORITY } from "../constants/board";
import type {
  ActivityEntry,
  GeneratedTaskSuggestion,
  Initiative,
  PriorityId,
  WorkCard,
  WorkspaceState,
} from "../types/workspace";
import { createId } from "../utils/ids";
import { normalizeColumn, normalizePriority, getColumnTitle } from "../utils/board";

function remember(state: WorkspaceState, title: string, context: string): WorkspaceState {
  return {
    ...state,
    activity: [
      {
        id: createId("memory"),
        title,
        context,
        at: new Date().toISOString(),
      },
      ...state.activity,
    ].slice(0, 12),
  };
}

export function createEmptyState(): WorkspaceState {
  return {
    activeInitiativeId: "",
    initiatives: [],
    activity: [],
  };
}

export function createInitialState(): WorkspaceState {
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
          createSeedCard("Finalize launch timeline", "Confirm milestone owners, review dependencies, and publish the release path.", "Marketing sign-off is required before the public date is committed.", "p1", "in-progress", now),
          createSeedCard("Approve support briefing", "Align response templates, escalation routes, and rollout messaging.", "Support wants final screenshots from product before publishing.", "p1", "in-progress", now),
          createSeedCard("Run payment regression", "Execute checkout coverage with production-like scenarios.", "Last issue came from coupon handling on mobile Safari.", "p0", "backlog", now),
        ],
      },
      {
        id: onboardingId,
        name: "Onboarding refresh",
        goal: "Increase early activation by simplifying the first-session path and reducing ambiguity.",
        createdAt: now,
        cards: [
          createSeedCard("Instrument activation funnel", "Capture first project, first invite, and first completed workflow.", "Metrics need to be in place before content changes ship.", "p1", "backlog", now),
          createSeedCard("Rewrite empty states", "Replace generic copy with direct next actions tailored to role.", "Tone should be factual and directive.", "p2", "in-progress", now),
          createSeedCard("Prototype checklist reveal", "Test staged task exposure after workspace creation.", "", "p3", "done", now),
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

function createSeedCard(
  title: string,
  details: string,
  memory: string,
  priority: PriorityId,
  column: WorkCard["column"],
  updatedAt: string,
): WorkCard {
  return {
    id: createId("card"),
    title,
    details,
    memory,
    priority,
    column,
    updatedAt,
  };
}

export function normalizeState(state: Partial<WorkspaceState> | null | undefined): WorkspaceState {
  return {
    ...createEmptyState(),
    ...state,
    initiatives: (state?.initiatives ?? []).map((initiative) => ({
      ...initiative,
      goal: initiative.goal ?? "",
      cards: (initiative.cards ?? []).map((card) => ({
        ...card,
        details: card.details ?? "",
        memory: card.memory ?? "",
        column: normalizeColumn(card.column),
        priority: normalizePriority(card.priority),
      })),
    })),
    activity: Array.isArray(state?.activity) ? state.activity : [],
    activeInitiativeId: typeof state?.activeInitiativeId === "string" ? state.activeInitiativeId : "",
  };
}

export function createInitiative(
  state: WorkspaceState,
  values: { name: string; goal?: string },
): WorkspaceState {
  const initiative: Initiative = {
    id: createId("initiative"),
    name: values.name.trim(),
    goal: (values.goal ?? "").trim(),
    createdAt: new Date().toISOString(),
    cards: [],
  };

  return remember(
    {
      ...state,
      activeInitiativeId: initiative.id,
      initiatives: [initiative, ...state.initiatives],
    },
    `Created initiative "${initiative.name}"`,
    initiative.goal || "No goal added yet.",
  );
}

export function updateInitiative(
  state: WorkspaceState,
  initiativeId: string,
  values: { name: string; goal?: string },
): WorkspaceState {
  const nextState = structuredClone(state) as WorkspaceState;
  const initiative = nextState.initiatives.find((item) => item.id === initiativeId);
  if (!initiative) return state;

  initiative.name = values.name.trim();
  initiative.goal = (values.goal ?? "").trim();

  return remember(
    nextState,
    `Updated initiative "${initiative.name}"`,
    initiative.goal || "No goal added yet.",
  );
}

export function deleteInitiative(state: WorkspaceState, initiativeId: string): WorkspaceState {
  const initiative = state.initiatives.find((item) => item.id === initiativeId);
  if (!initiative) return state;

  const nextInitiatives = state.initiatives.filter((item) => item.id !== initiativeId);
  return remember(
    {
      ...state,
      activeInitiativeId: nextInitiatives[0]?.id || "",
      initiatives: nextInitiatives,
    },
    `Deleted initiative "${initiative.name}"`,
    `Removed ${initiative.cards.length} card${initiative.cards.length === 1 ? "" : "s"}.`,
  );
}

export function reorderInitiatives(
  state: WorkspaceState,
  sourceInitiativeId: string,
  targetInitiativeId: string,
): WorkspaceState {
  if (!sourceInitiativeId || !targetInitiativeId || sourceInitiativeId === targetInitiativeId) {
    return state;
  }

  const currentIndex = state.initiatives.findIndex((initiative) => initiative.id === sourceInitiativeId);
  const targetIndex = state.initiatives.findIndex((initiative) => initiative.id === targetInitiativeId);
  if (currentIndex === -1 || targetIndex === -1) return state;

  const nextInitiatives = [...state.initiatives];
  const [moved] = nextInitiatives.splice(currentIndex, 1);
  nextInitiatives.splice(targetIndex, 0, moved);

  return remember(
    {
      ...state,
      initiatives: nextInitiatives,
    },
    `Reordered initiative "${moved.name}"`,
    "Priority changed in the initiative list.",
  );
}

export function createCard(
  state: WorkspaceState,
  initiativeId: string,
  values: { title: string; details?: string; notes?: string; priority?: PriorityId },
): WorkspaceState {
  const nextState = structuredClone(state) as WorkspaceState;
  const initiative = nextState.initiatives.find((item) => item.id === initiativeId);
  if (!initiative) return state;

  const title = values.title.trim();
  initiative.cards.push({
    id: createId("card"),
    title,
    details: (values.details ?? "").trim(),
    memory: (values.notes ?? "").trim(),
    priority: values.priority ?? DEFAULT_PRIORITY,
    column: "backlog",
    updatedAt: new Date().toISOString(),
  });

  nextState.activeInitiativeId = initiativeId;
  return remember(
    nextState,
    `Added card "${title}"`,
    (values.notes ?? "").trim() || (values.details ?? "").trim() || `Placed in Backlog for ${initiative.name}.`,
  );
}

export function updateCard(
  state: WorkspaceState,
  initiativeId: string,
  cardId: string,
  values: { title: string; details?: string; notes?: string; priority?: PriorityId },
): WorkspaceState {
  const nextState = structuredClone(state) as WorkspaceState;
  const initiative = nextState.initiatives.find((item) => item.id === initiativeId);
  const card = initiative?.cards.find((item) => item.id === cardId);
  if (!initiative || !card) return state;

  card.title = values.title.trim();
  card.details = (values.details ?? "").trim();
  card.memory = (values.notes ?? "").trim();
  card.priority = values.priority ?? DEFAULT_PRIORITY;
  card.updatedAt = new Date().toISOString();
  nextState.activeInitiativeId = initiativeId;

  return remember(
    nextState,
    `Updated card "${card.title}"`,
    card.memory || card.details || `Updated in ${initiative.name}.`,
  );
}

export function deleteCard(state: WorkspaceState, initiativeId: string, cardId: string): WorkspaceState {
  const nextState = structuredClone(state) as WorkspaceState;
  const initiative = nextState.initiatives.find((item) => item.id === initiativeId);
  if (!initiative) return state;

  const index = initiative.cards.findIndex((card) => card.id === cardId);
  if (index === -1) return state;

  const [deleted] = initiative.cards.splice(index, 1);
  nextState.activeInitiativeId = initiativeId;

  return remember(
    nextState,
    `Deleted "${deleted.title}"`,
    `Removed from ${initiative.name}.`,
  );
}

export function moveCard(
  state: WorkspaceState,
  sourceInitiativeId: string,
  cardId: string,
  targetInitiativeId: string,
  targetColumnId: WorkCard["column"],
): { state: WorkspaceState; celebrate: boolean } {
  const nextState = structuredClone(state) as WorkspaceState;
  const sourceInitiative = nextState.initiatives.find((initiative) => initiative.id === sourceInitiativeId);
  const targetInitiative = nextState.initiatives.find((initiative) => initiative.id === targetInitiativeId);
  if (!sourceInitiative || !targetInitiative) {
    return { state, celebrate: false };
  }

  const sourceIndex = sourceInitiative.cards.findIndex((card) => card.id === cardId);
  if (sourceIndex === -1) {
    return { state, celebrate: false };
  }

  const sourceCard = sourceInitiative.cards[sourceIndex];
  if (sourceInitiativeId === targetInitiativeId && sourceCard.column === targetColumnId) {
    return { state, celebrate: false };
  }

  const [card] = sourceInitiative.cards.splice(sourceIndex, 1);
  const previousColumn = getColumnTitle(card.column);
  const nextColumn = getColumnTitle(targetColumnId);
  const movedAcrossInitiatives = sourceInitiativeId !== targetInitiativeId;
  const shouldCelebrate = card.column !== "done" && targetColumnId === "done";

  card.column = targetColumnId;
  card.updatedAt = new Date().toISOString();
  targetInitiative.cards.push(card);
  nextState.activeInitiativeId = targetInitiativeId;

  return {
    celebrate: shouldCelebrate,
    state: remember(
      nextState,
      `Moved "${card.title}" to ${nextColumn}`,
      movedAcrossInitiatives
        ? `Reassigned from ${sourceInitiative.name} to ${targetInitiative.name}, from ${previousColumn} to ${nextColumn}.`
        : `Transitioned from ${previousColumn} in ${targetInitiative.name}.`,
    ),
  };
}

export function importGeneratedTasks(
  state: WorkspaceState,
  initiativeId: string,
  suggestions: GeneratedTaskSuggestion[],
  summary: string,
): WorkspaceState {
  const nextState = structuredClone(state) as WorkspaceState;
  const initiative = nextState.initiatives.find((item) => item.id === initiativeId);
  if (!initiative) return state;

  const now = new Date().toISOString();
  const createdCards = suggestions.map((suggestion) => ({
    id: createId("card"),
    title: suggestion.title,
    details: suggestion.details,
    memory: suggestion.notes,
    priority: suggestion.priority,
    column: "backlog" as const,
    updatedAt: now,
  }));

  initiative.cards.push(...createdCards);
  nextState.activeInitiativeId = initiativeId;
  return remember(
    nextState,
    `Imported ${createdCards.length} generated task${createdCards.length === 1 ? "" : "s"}`,
    summary || `Added generated tasks to ${initiative.name}.`,
  );
}

export function resetWorkspace(): WorkspaceState {
  return remember(createInitialState(), "Reset workspace", "Started over with a fresh board.");
}
