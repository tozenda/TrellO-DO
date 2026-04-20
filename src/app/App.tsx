import { useEffect, useMemo, useRef, useState } from "react";
import { App as AntApp, ConfigProvider, Form, Input, Layout } from "antd";
import type { InputRef } from "antd";
import { createThemeConfig } from "@/app/theme";
import { CelebrationLayer } from "@/features/celebration/components/CelebrationLayer";
import { createCelebration, type Celebration } from "@/features/celebration/utils";
import { Board } from "@/features/board/components/Board";
import { CardModal } from "@/features/cards/components/CardModal";
import { ReviewGeneratedTasksModal } from "@/features/generation/components/ReviewGeneratedTasksModal";
import { GenerateTasksModal } from "@/features/generation/components/GenerateTasksModal";
import { InitiativeModal } from "@/features/initiatives/components/InitiativeModal";
import { InitiativesSidebar } from "@/features/initiatives/components/InitiativesSidebar";
import { useTaskGeneration } from "@/features/generation/hooks/useTaskGeneration";
import { useWorkspace } from "@/features/workspace/hooks/useWorkspace";
import {
  createCard,
  createInitiative,
  deleteCard,
  deleteInitiative,
  resetWorkspace,
  reorderInitiatives,
  updateCard,
  updateInitiative,
  moveCard,
} from "@/shared/state/workspace";
import type { Initiative, PriorityId, WorkCard } from "@/shared/types/workspace";

export default function WorkspaceApp() {
  const { capabilities, isDarkMode, isLoadingState, saveError, setIsDarkMode, setState, state } =
    useWorkspace();
  const [filterInitiativeId, setFilterInitiativeId] = useState<string | null>(null);
  const [expandedInitiativeIds, setExpandedInitiativeIds] = useState<string[]>([]);
  const [expandedNotesCardIds, setExpandedNotesCardIds] = useState<string[]>([]);
  const [initiativeModalOpen, setInitiativeModalOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingInitiativeId, setEditingInitiativeId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<{ initiativeId: string; cardId: string } | null>(null);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [cardTargetInitiativeId, setCardTargetInitiativeId] = useState<string | null>(null);
  const [initiativeForm] = Form.useForm<{ name: string; goal?: string }>();
  const [cardForm] = Form.useForm<{ title: string; details?: string; notes?: string; priority: PriorityId }>();
  const [generateTasksForm] = Form.useForm<{ instructions?: string; priorityOverride?: PriorityId | "" }>();
  const [reviewTasksForm] = Form.useForm();
  const initiativeNameInputRef = useRef<InputRef | null>(null);
  const cardTitleInputRef = useRef<InputRef | null>(null);
  const dragRef = useRef<{ cardId: string; sourceInitiativeId: string } | null>(null);
  const initiativeDragRef = useRef<string | null>(null);

  const taskGeneration = useTaskGeneration({
    reviewTasksForm,
    setState,
    setCardTargetInitiativeId,
  });

  const activeInitiative = state.initiatives.find(
    (initiative) => initiative.id === state.activeInitiativeId,
  );
  const visibleInitiatives = filterInitiativeId
    ? state.initiatives.filter((initiative) => initiative.id === filterInitiativeId)
    : state.initiatives;
  const cardTargetInitiative = state.initiatives.find(
    (initiative) => initiative.id === cardTargetInitiativeId,
  );
  const generationTargetInitiative = state.initiatives.find(
    (initiative) => initiative.id === taskGeneration.generationTargetInitiativeId,
  );
  const isAiTaskGenerationEnabled = capabilities.aiTaskGeneration?.enabled !== false;
  const aiTaskGenerationReason = capabilities.aiTaskGeneration?.reason || "";

  const totalCards = useMemo(
    () => state.initiatives.reduce((sum, initiative) => sum + initiative.cards.length, 0),
    [state.initiatives],
  );
  const inProgressCards = useMemo(
    () =>
      state.initiatives.reduce(
        (sum, initiative) =>
          sum + initiative.cards.filter((card) => card.column === "in-progress").length,
        0,
      ),
    [state.initiatives],
  );
  const doneCards = useMemo(
    () =>
      state.initiatives.reduce(
        (sum, initiative) => sum + initiative.cards.filter((card) => card.column === "done").length,
        0,
      ),
    [state.initiatives],
  );

  useEffect(() => {
    const initiativeIds = state.initiatives.map((initiative) => initiative.id);
    setExpandedInitiativeIds((current) => {
      const kept = current.filter((initiativeId) => initiativeIds.includes(initiativeId));
      const added = initiativeIds.filter((initiativeId) => !kept.includes(initiativeId));
      return [...kept, ...added];
    });

    if (
      filterInitiativeId &&
      !state.initiatives.some((initiative) => initiative.id === filterInitiativeId)
    ) {
      setFilterInitiativeId(null);
    }
  }, [filterInitiativeId, state.initiatives]);

  useEffect(() => {
    if (
      cardTargetInitiativeId &&
      state.initiatives.some((initiative) => initiative.id === cardTargetInitiativeId)
    ) {
      return;
    }

    setCardTargetInitiativeId(state.activeInitiativeId || state.initiatives[0]?.id || null);
  }, [cardTargetInitiativeId, state.activeInitiativeId, state.initiatives]);

  useEffect(() => {
    if (initiativeModalOpen) {
      requestAnimationFrame(() => initiativeNameInputRef.current?.focus());
    }
  }, [initiativeModalOpen]);

  useEffect(() => {
    if (cardModalOpen) {
      requestAnimationFrame(() => cardTitleInputRef.current?.focus());
    }
  }, [cardModalOpen]);

  function setActiveInitiative(initiativeId: string) {
    setState((current) => ({
      ...current,
      activeInitiativeId: initiativeId,
    }));
  }

  function openInitiativeModal() {
    setEditingInitiativeId(null);
    initiativeForm.resetFields();
    setInitiativeModalOpen(true);
  }

  function openEditInitiativeModal(initiative: Initiative) {
    setEditingInitiativeId(initiative.id);
    setActiveInitiative(initiative.id);
    initiativeForm.setFieldsValue({
      name: initiative.name,
      goal: initiative.goal,
    });
    setInitiativeModalOpen(true);
  }

  function closeInitiativeModal() {
    setInitiativeModalOpen(false);
    setEditingInitiativeId(null);
    initiativeForm.resetFields();
  }

  function handleSaveInitiative(values: { name: string; goal?: string }) {
    let nextActiveInitiativeId: string | null = null;
    setState((current) => {
      const nextState = editingInitiativeId
        ? updateInitiative(current, editingInitiativeId, values)
        : createInitiative(current, values);
      nextActiveInitiativeId = nextState.activeInitiativeId || null;
      return nextState;
    });

    if (!editingInitiativeId) {
      setFilterInitiativeId(nextActiveInitiativeId);
    }

    setInitiativeModalOpen(false);
    setEditingInitiativeId(null);
    initiativeForm.resetFields();
  }

  function openCardModal(initiativeId = state.activeInitiativeId) {
    setEditingCard(null);
    if (initiativeId) {
      setActiveInitiative(initiativeId);
      setCardTargetInitiativeId(initiativeId);
    }
    cardForm.resetFields();
    cardForm.setFieldsValue({ priority: "p2" });
    setCardModalOpen(true);
  }

  function openEditCardModal(initiativeId: string, card: WorkCard) {
    setActiveInitiative(initiativeId);
    setCardTargetInitiativeId(initiativeId);
    setEditingCard({
      initiativeId,
      cardId: card.id,
    });
    cardForm.setFieldsValue({
      title: card.title,
      details: card.details,
      notes: card.memory,
      priority: card.priority,
    });
    setCardModalOpen(true);
  }

  function closeCardModal() {
    setCardModalOpen(false);
    setEditingCard(null);
    cardForm.resetFields();
  }

  function handleSaveCard(values: { title: string; details?: string; notes?: string; priority: PriorityId }) {
    const initiativeId = editingCard?.initiativeId || cardTargetInitiativeId || state.activeInitiativeId;
    if (!initiativeId) return;

    setState((current) =>
      editingCard
        ? updateCard(current, initiativeId, editingCard.cardId, values)
        : createCard(current, initiativeId, values),
    );

    setCardModalOpen(false);
    setEditingCard(null);
    cardForm.resetFields();
  }

  function handleDeleteInitiative(initiativeId: string) {
    const initiative = state.initiatives.find((item) => item.id === initiativeId);
    if (!initiative) return;
    if (!window.confirm(`Delete initiative "${initiative.name}" and all its cards?`)) return;

    setState((current) => deleteInitiative(current, initiativeId));
    if (filterInitiativeId === initiativeId) {
      setFilterInitiativeId(null);
    }
    if (cardTargetInitiativeId === initiativeId) {
      setCardTargetInitiativeId(null);
    }
    if (editingInitiativeId === initiativeId) {
      closeInitiativeModal();
    }
  }

  function handleDeleteCard(initiativeId: string, cardId: string) {
    setState((current) => deleteCard(current, initiativeId, cardId));
  }

  function handleReorderInitiatives(sourceInitiativeId: string, targetInitiativeId: string) {
    setState((current) => reorderInitiatives(current, sourceInitiativeId, targetInitiativeId));
  }

  function handleReset() {
    if (!window.confirm("Reset all initiatives, cards, and memory?")) return;
    setState(resetWorkspace());
    setCardTargetInitiativeId(null);
  }

  function launchCelebration() {
    const celebration = createCelebration();
    setCelebrations((current) => [...current, celebration]);
    window.setTimeout(() => {
      setCelebrations((current) => current.filter((item) => item.id !== celebration.id));
    }, 2200);
  }

  function handleDrop(targetInitiativeId: string, targetColumnId: WorkCard["column"]) {
    if (!dragRef.current) return;

    const { cardId, sourceInitiativeId } = dragRef.current;
    const result = moveCard(state, sourceInitiativeId, cardId, targetInitiativeId, targetColumnId);
    dragRef.current = null;
    if (result.state !== state) {
      setState(result.state);
      if (result.celebrate) {
        launchCelebration();
      }
    }
  }

  return (
    <ConfigProvider theme={createThemeConfig(isDarkMode)}>
      <AntApp>
        <Layout className="app-layout">
          <InitiativesSidebar
            initiatives={state.initiatives}
            activity={state.activity}
            activeInitiativeId={state.activeInitiativeId}
            filterInitiativeId={filterInitiativeId}
            isLoadingState={isLoadingState}
            isDarkMode={isDarkMode}
            saveError={saveError}
            totalCards={totalCards}
            inProgressCards={inProgressCards}
            doneCards={doneCards}
            isAiTaskGenerationEnabled={isAiTaskGenerationEnabled}
            aiTaskGenerationReason={aiTaskGenerationReason}
            onThemeChange={setIsDarkMode}
            onGenerate={() => taskGeneration.openGenerateTasksModal(activeInitiative?.id || null)}
            onNewInitiative={openInitiativeModal}
            onFilterChange={(initiativeId) => {
              setFilterInitiativeId(initiativeId);
              if (initiativeId) {
                setActiveInitiative(initiativeId);
                setExpandedInitiativeIds((current) =>
                  current.includes(initiativeId) ? current : [initiativeId, ...current],
                );
              }
            }}
            onReorderInitiatives={handleReorderInitiatives}
            onReset={handleReset}
            initiativeDragRef={initiativeDragRef}
          />

          <Layout>
            <Board
              initiatives={visibleInitiatives}
              isLoadingState={isLoadingState}
              totalCards={totalCards}
              inProgressCards={inProgressCards}
              doneCards={doneCards}
              expandedInitiativeIds={expandedInitiativeIds}
              expandedNotesCardIds={expandedNotesCardIds}
              isAiTaskGenerationEnabled={isAiTaskGenerationEnabled}
              onToggleInitiative={(initiativeId) =>
                setExpandedInitiativeIds((current) =>
                  current.includes(initiativeId)
                    ? current.filter((id) => id !== initiativeId)
                    : [...current, initiativeId],
                )
              }
              onGenerateTasks={(initiativeId) => {
                setActiveInitiative(initiativeId);
                taskGeneration.openGenerateTasksModal(initiativeId);
              }}
              onEditInitiative={openEditInitiativeModal}
              onDeleteInitiative={handleDeleteInitiative}
              onAddCard={openCardModal}
              onEditCard={openEditCardModal}
              onDeleteCard={handleDeleteCard}
              onToggleNotes={(cardId) =>
                setExpandedNotesCardIds((current) =>
                  current.includes(cardId)
                    ? current.filter((id) => id !== cardId)
                    : [...current, cardId],
                )
              }
              onCardDragStart={(cardId, sourceInitiativeId) => {
                dragRef.current = { cardId, sourceInitiativeId };
              }}
              onCardDragEnd={() => {
                dragRef.current = null;
              }}
              onDrop={handleDrop}
            />
          </Layout>

          <InitiativeModal
            form={initiativeForm}
            inputRef={initiativeNameInputRef}
            isOpen={initiativeModalOpen}
            isEditing={Boolean(editingInitiativeId)}
            onCancel={closeInitiativeModal}
            onSubmit={() => initiativeForm.submit()}
            onFinish={handleSaveInitiative}
          />

          <CardModal
            form={cardForm}
            inputRef={cardTitleInputRef}
            isOpen={cardModalOpen}
            isEditing={Boolean(editingCard)}
            cardTargetInitiative={cardTargetInitiative}
            onCancel={closeCardModal}
            onSubmit={() => cardForm.submit()}
            onFinish={handleSaveCard}
          />

          <GenerateTasksModal
            form={generateTasksForm}
            initiative={generationTargetInitiative}
            isOpen={taskGeneration.generateTasksModalOpen}
            isGenerating={taskGeneration.isGeneratingTasks}
            isEnabled={isAiTaskGenerationEnabled}
            reason={aiTaskGenerationReason}
            error={taskGeneration.generationError}
            onCancel={() => taskGeneration.closeGenerateTasksModal(generateTasksForm)}
            onSubmit={() => generateTasksForm.submit()}
            onFinish={taskGeneration.handleGenerateTasks}
          />

          <ReviewGeneratedTasksModal
            form={reviewTasksForm}
            initiative={generationTargetInitiative}
            isOpen={taskGeneration.reviewTasksModalOpen}
            isGenerating={taskGeneration.isGeneratingTasks}
            generatedSummary={taskGeneration.generatedSummary}
            reviewError={taskGeneration.reviewError}
            onCancel={taskGeneration.closeReviewTasksModal}
            onSubmit={() => reviewTasksForm.submit()}
            onRegenerate={taskGeneration.handleRegenerateTasks}
            onSelectAll={() => taskGeneration.handleReviewSelection(true)}
            onClear={() => taskGeneration.handleReviewSelection(false)}
            onFinish={taskGeneration.handleImportGeneratedTasks}
          />

          <CelebrationLayer celebrations={celebrations} />
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}
