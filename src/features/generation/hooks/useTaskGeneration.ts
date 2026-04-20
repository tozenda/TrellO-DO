import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FormInstance } from "antd";
import { requestTaskGeneration } from "@/shared/api/workspace";
import type { GeneratedTaskSuggestion, TaskGenerationRequest, WorkspaceState } from "@/shared/types/workspace";
import { normalizeGeneratedSuggestion } from "@/shared/utils/generation";
import { clampText } from "@/shared/utils/text";
import { getRequestErrorMessage } from "@/shared/utils/requests";
import { importGeneratedTasks } from "@/shared/state/workspace";

interface UseTaskGenerationParams {
  reviewTasksForm: FormInstance<{ suggestions: GeneratedTaskSuggestion[] }>;
  setState: Dispatch<SetStateAction<WorkspaceState>>;
  setCardTargetInitiativeId: Dispatch<SetStateAction<string | null>>;
}

export function useTaskGeneration({
  reviewTasksForm,
  setState,
  setCardTargetInitiativeId,
}: UseTaskGenerationParams) {
  const [generateTasksModalOpen, setGenerateTasksModalOpen] = useState(false);
  const [reviewTasksModalOpen, setReviewTasksModalOpen] = useState(false);
  const [generationTargetInitiativeId, setGenerationTargetInitiativeId] = useState<string | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [lastGenerationRequest, setLastGenerationRequest] = useState<TaskGenerationRequest | null>(null);

  function openGenerateTasksModal(initiativeId: string | null) {
    if (!initiativeId) return;
    setGenerationTargetInitiativeId(initiativeId);
    setGenerationError("");
    setReviewError("");
    setGenerateTasksModalOpen(true);
  }

  function closeGenerateTasksModal(generateTasksForm: FormInstance) {
    if (isGeneratingTasks) return;
    setGenerateTasksModalOpen(false);
    setGenerationError("");
    generateTasksForm.resetFields();
  }

  function closeReviewTasksModal() {
    setReviewTasksModalOpen(false);
    setGeneratedSummary("");
    setReviewError("");
    reviewTasksForm.resetFields();
  }

  function applyGeneratedTaskResponse(response: {
    rawSummary?: string;
    suggestions: GeneratedTaskSuggestion[];
  }) {
    setGeneratedSummary(clampText(response.rawSummary || "", 600));
    setReviewError("");
    reviewTasksForm.setFieldsValue({
      suggestions: response.suggestions,
    });
  }

  async function generateTaskSuggestions(request: TaskGenerationRequest) {
    const response = await requestTaskGeneration({
      initiativeId: request.initiativeId,
      instructions: request.instructions,
    });

    return {
      ...response,
      suggestions: (response.suggestions || [])
        .map((suggestion) =>
          normalizeGeneratedSuggestion(suggestion, {
            selected: true,
            priorityOverride: request.priorityOverride,
          }),
        )
        .filter((suggestion): suggestion is GeneratedTaskSuggestion => Boolean(suggestion)),
    };
  }

  async function handleGenerateTasks(values: { instructions?: string; priorityOverride?: TaskGenerationRequest["priorityOverride"] }) {
    if (!generationTargetInitiativeId) return false;

    setIsGeneratingTasks(true);
    setGenerationError("");

    try {
      const nextRequest: TaskGenerationRequest = {
        initiativeId: generationTargetInitiativeId,
        instructions: (values.instructions || "").trim(),
        priorityOverride: values.priorityOverride || "",
      };

      const response = await generateTaskSuggestions(nextRequest);
      setLastGenerationRequest(nextRequest);
      setGenerateTasksModalOpen(false);
      applyGeneratedTaskResponse(response);
      setReviewTasksModalOpen(true);
      return true;
    } catch (error) {
      setGenerationError(getRequestErrorMessage(error));
      return false;
    } finally {
      setIsGeneratingTasks(false);
    }
  }

  async function handleRegenerateTasks() {
    if (!lastGenerationRequest) {
      setReviewError("No previous generation request is available.");
      return;
    }

    setIsGeneratingTasks(true);
    setReviewError("");

    try {
      const response = await generateTaskSuggestions(lastGenerationRequest);
      applyGeneratedTaskResponse(response);
    } catch (error) {
      setReviewError(getRequestErrorMessage(error));
    } finally {
      setIsGeneratingTasks(false);
    }
  }

  function handleReviewSelection(selectAll: boolean) {
    const suggestions = reviewTasksForm.getFieldValue("suggestions") || [];
    reviewTasksForm.setFieldsValue({
      suggestions: suggestions.map((suggestion) => ({
        ...suggestion,
        selected: selectAll,
      })),
    });
  }

  function handleImportGeneratedTasks(values: { suggestions?: GeneratedTaskSuggestion[] }) {
    const suggestions = (values.suggestions || [])
      .filter((suggestion) => suggestion?.selected !== false)
      .map((suggestion) => normalizeGeneratedSuggestion(suggestion))
      .filter((suggestion): suggestion is GeneratedTaskSuggestion => Boolean(suggestion));

    if (!generationTargetInitiativeId) {
      setReviewError("No initiative is selected for generated tasks.");
      return false;
    }

    if (suggestions.length === 0) {
      setReviewError("Add at least one suggested task before importing.");
      return false;
    }

    let updated = false;
    setState((current) => {
      const nextState = importGeneratedTasks(
        current,
        generationTargetInitiativeId,
        suggestions,
        generatedSummary,
      );
      updated = nextState !== current;
      return nextState;
    });

    if (updated) {
      setCardTargetInitiativeId(generationTargetInitiativeId);
      closeReviewTasksModal();
    }

    return updated;
  }

  return {
    closeGenerateTasksModal,
    closeReviewTasksModal,
    generateTasksModalOpen,
    generatedSummary,
    generationError,
    generationTargetInitiativeId,
    handleGenerateTasks,
    handleImportGeneratedTasks,
    handleRegenerateTasks,
    handleReviewSelection,
    isGeneratingTasks,
    openGenerateTasksModal,
    reviewError,
    reviewTasksModalOpen,
  };
}
