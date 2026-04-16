import { useEffect, useRef, useState } from "react";
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  RightOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App as AntApp,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  ConfigProvider,
  Empty,
  Form,
  Input,
  Layout,
  List,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Tag,
  theme as antdTheme,
  Typography,
} from "antd";

const { Content, Sider } = Layout;
const { Text, Title, Paragraph } = Typography;
const THEME_KEY = "trello-do-theme";
const WORKSPACE_ENDPOINT = "/api/workspace";
const AI_GENERATE_TASKS_ENDPOINT = "/api/ai/generate-tasks";

const COLUMN_DEFS = [
  { id: "backlog", title: "Backlog", color: "blue" },
  { id: "in-progress", title: "In Progress", color: "cyan" },
  { id: "done", title: "Done", color: "default" },
];

const CARD_PRIORITIES = [
  { id: "p0", label: "P0", title: "Critical", color: "red", rank: 0 },
  { id: "p1", label: "P1", title: "High", color: "volcano", rank: 1 },
  { id: "p2", label: "P2", title: "Medium", color: "gold", rank: 2 },
  { id: "p3", label: "P3", title: "Low", color: "default", rank: 3 },
];

export default function WorkspaceApp() {
  const [isDarkMode, setIsDarkMode] = useState(loadThemePreference);
  const [state, setState] = useState(createEmptyState);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [filterInitiativeId, setFilterInitiativeId] = useState(null);
  const [expandedInitiativeIds, setExpandedInitiativeIds] = useState([]);
  const [expandedNotesCardIds, setExpandedNotesCardIds] = useState([]);
  const [initiativeModalOpen, setInitiativeModalOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [generateTasksModalOpen, setGenerateTasksModalOpen] = useState(false);
  const [reviewTasksModalOpen, setReviewTasksModalOpen] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [celebrations, setCelebrations] = useState([]);
  const [cardTargetInitiativeId, setCardTargetInitiativeId] = useState(null);
  const [generationTargetInitiativeId, setGenerationTargetInitiativeId] = useState(null);
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [lastGenerationRequest, setLastGenerationRequest] = useState(null);
  const [initiativeForm] = Form.useForm();
  const [cardForm] = Form.useForm();
  const [generateTasksForm] = Form.useForm();
  const [reviewTasksForm] = Form.useForm();
  const initiativeNameInputRef = useRef(null);
  const cardTitleInputRef = useRef(null);
  const dragRef = useRef(null);
  const initiativeDragRef = useRef(null);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light");
    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  useEffect(() => {
    let isCancelled = false;

    async function loadWorkspaceState() {
      try {
        const loadedState = normalizeState(await requestWorkspace("GET"));
        if (isCancelled) return;
        setState(loadedState);
        setCardTargetInitiativeId(loadedState.activeInitiativeId || null);
        setSaveError("");
      } catch (error) {
        console.error("Failed to load workspace state.", error);
        if (isCancelled) return;
        setState(createInitialState());
        setCardTargetInitiativeId(null);
        setSaveError("Workspace file could not be loaded. Using fallback state.");
      } finally {
        if (!isCancelled) {
          setIsLoadingState(false);
        }
      }
    }

    loadWorkspaceState();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoadingState) return;

    const timeoutId = window.setTimeout(() => {
      requestWorkspace("PUT", state)
        .then(() => {
          setSaveError("");
        })
        .catch((error) => {
          console.error("Failed to persist workspace state.", error);
          setSaveError("Changes are not being persisted to disk.");
        });
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [state, isLoadingState]);

  useEffect(() => {
    const initiativeIds = state.initiatives.map((initiative) => initiative.id);
    setExpandedInitiativeIds((current) => {
      const kept = current.filter((initiativeId) =>
        initiativeIds.includes(initiativeId),
      );
      const added = initiativeIds.filter((initiativeId) => !kept.includes(initiativeId));
      return [...kept, ...added];
    });

    if (
      filterInitiativeId &&
      !state.initiatives.some((initiative) => initiative.id === filterInitiativeId)
    ) {
      setFilterInitiativeId(null);
    }
  }, [state.initiatives, filterInitiativeId]);

  useEffect(() => {
    if (
      cardTargetInitiativeId &&
      state.initiatives.some((initiative) => initiative.id === cardTargetInitiativeId)
    ) {
      return;
    }

    setCardTargetInitiativeId(state.activeInitiativeId || state.initiatives[0]?.id || null);
  }, [state.initiatives, state.activeInitiativeId, cardTargetInitiativeId]);

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
    (initiative) => initiative.id === generationTargetInitiativeId,
  );
  const totalCards = state.initiatives.reduce(
    (sum, initiative) => sum + initiative.cards.length,
    0,
  );
  const inProgressCards = state.initiatives.reduce(
    (sum, initiative) =>
      sum +
      initiative.cards.filter((card) => card.column === "in-progress").length,
    0,
  );
  const doneCards = state.initiatives.reduce(
    (sum, initiative) =>
      sum + initiative.cards.filter((card) => card.column === "done").length,
    0,
  );

  const themeConfig = {
    algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: "#1677ff",
      colorInfo: "#1677ff",
      colorSuccess: "#14b8a6",
      colorWarning: "#d97706",
      colorError: "#ef4444",
      borderRadius: 14,
      fontFamily:
        '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      colorBgBase: isDarkMode ? "#0b1220" : "#f5f7fa",
      colorBgContainer: isDarkMode ? "#101828" : "#ffffff",
      colorText: isDarkMode ? "#f8fafc" : "#101828",
      colorTextSecondary: isDarkMode ? "#98a2b3" : "#667085",
      colorBorderSecondary: isDarkMode ? "#1f2937" : "#eaecf0",
    },
    components: {
      Layout: {
        bodyBg: isDarkMode ? "#0b1220" : "#f5f7fa",
        siderBg: isDarkMode ? "#101828" : "#ffffff",
      },
      Card: {
        borderRadiusLG: 18,
      },
      Button: {
        borderRadius: 12,
        controlHeight: 40,
      },
      Input: {
        borderRadius: 12,
        controlHeight: 42,
      },
      Modal: {
        borderRadiusLG: 20,
      },
    },
  };

  function commit(nextState) {
    setState(nextState);
  }

  function remember(nextState, title, context) {
    nextState.activity = [
      {
        id: createId("memory"),
        title,
        context,
        at: new Date().toISOString(),
      },
      ...nextState.activity,
    ].slice(0, 12);
  }

  function handleCreateInitiative(values) {
    const initiative = {
      id: createId("initiative"),
      name: values.name.trim(),
      goal: (values.goal || "").trim(),
      createdAt: new Date().toISOString(),
      cards: [],
    };

    const nextState = {
      ...state,
      activeInitiativeId: initiative.id,
      initiatives: [initiative, ...state.initiatives],
      activity: [...state.activity],
    };

    remember(
      nextState,
      `Created initiative "${initiative.name}"`,
      initiative.goal || "No goal added yet.",
    );
    setFilterInitiativeId(initiative.id);
    setExpandedInitiativeIds((current) =>
      current.includes(initiative.id) ? current : [initiative.id, ...current],
    );
    commit(nextState);
    setInitiativeModalOpen(false);
    initiativeForm.resetFields();
    setCardTargetInitiativeId(initiative.id);
  }

  function handleSaveInitiative(values) {
    if (!editingInitiative) {
      handleCreateInitiative(values);
      return;
    }

    const name = values.name.trim();
    const goal = (values.goal || "").trim();
    if (!name) return;

    const nextState = structuredClone(state);
    const initiative = nextState.initiatives.find(
      (item) => item.id === editingInitiative.id,
    );
    if (!initiative) return;

    initiative.name = name;
    initiative.goal = goal;

    remember(
      nextState,
      `Updated initiative "${initiative.name}"`,
      goal || "No goal added yet.",
    );

    commit(nextState);
    setInitiativeModalOpen(false);
    setEditingInitiative(null);
    initiativeForm.resetFields();
  }

  function handleCreateCard(values) {
    const initiativeId = cardTargetInitiativeId || state.activeInitiativeId;
    const title = values.title.trim();
    const details = (values.details || "").trim();
    const notes = (values.notes || "").trim();
    const priority = values.priority || "p2";
    if (!initiativeId || !title) return;

    const nextState = structuredClone(state);
    const initiative = nextState.initiatives.find(
      (item) => item.id === initiativeId,
    );
    if (!initiative) return;

    initiative.cards.push({
      id: createId("card"),
      title,
      details,
      memory: notes,
      priority,
      column: "backlog",
      updatedAt: new Date().toISOString(),
    });
    nextState.activeInitiativeId = initiativeId;

    remember(
      nextState,
      `Added card "${title}"`,
      notes || details || `Placed in Backlog for ${initiative.name}.`,
    );

    commit(nextState);
    setCardModalOpen(false);
    setEditingCard(null);
    cardForm.resetFields(["title", "details", "notes", "priority"]);
  }

  function handleSaveCard(values) {
    if (!editingCard) {
      handleCreateCard(values);
      return;
    }

    const title = values.title.trim();
    const details = (values.details || "").trim();
    const notes = (values.notes || "").trim();
    const priority = values.priority || "p2";
    if (!title) return;

    const nextState = structuredClone(state);
    const initiative = nextState.initiatives.find(
      (item) => item.id === editingCard.initiativeId,
    );
    if (!initiative) return;

    const card = initiative.cards.find((item) => item.id === editingCard.cardId);
    if (!card) return;

    card.title = title;
    card.details = details;
    card.memory = notes;
    card.priority = priority;
    card.updatedAt = new Date().toISOString();
    nextState.activeInitiativeId = initiative.id;

    remember(
      nextState,
      `Updated card "${title}"`,
      notes || details || `Updated in ${initiative.name}.`,
    );

    commit(nextState);
    setCardModalOpen(false);
    setEditingCard(null);
    cardForm.resetFields(["title", "details", "notes", "priority"]);
  }

  function openInitiativeModal() {
    setEditingInitiative(null);
    initiativeForm.resetFields();
    setInitiativeModalOpen(true);
  }

  function openEditInitiativeModal(initiative) {
    setEditingInitiative({ id: initiative.id });
    setActiveInitiative(initiative.id);
    initiativeForm.setFieldsValue({
      name: initiative.name,
      goal: initiative.goal,
    });
    setInitiativeModalOpen(true);
  }

  function closeInitiativeModal() {
    setInitiativeModalOpen(false);
    setEditingInitiative(null);
    initiativeForm.resetFields();
  }

  function openCardModal(initiativeId = state.activeInitiativeId) {
    setEditingCard(null);
    if (initiativeId) {
      setActiveInitiative(initiativeId);
      setCardTargetInitiativeId(initiativeId);
    }
    cardForm.resetFields(["title", "details", "notes", "priority"]);
    cardForm.setFieldsValue({ priority: "p2" });
    setCardModalOpen(true);
  }

  function openGenerateTasksModal(initiativeId = state.activeInitiativeId) {
    if (!initiativeId) return;
    setActiveInitiative(initiativeId);
    setGenerationTargetInitiativeId(initiativeId);
    setGenerationError("");
    setReviewError("");
    generateTasksForm.resetFields();
    setGenerateTasksModalOpen(true);
  }

  function closeGenerateTasksModal() {
    if (isGeneratingTasks) return;
    setGenerateTasksModalOpen(false);
    setGenerationError("");
    generateTasksForm.resetFields();
  }

  async function handleGenerateTasks(values) {
    if (!generationTargetInitiativeId) return;

    setIsGeneratingTasks(true);
    setGenerationError("");

    try {
      const nextRequest = {
        initiativeId: generationTargetInitiativeId,
        instructions: (values.instructions || "").trim(),
        priorityOverride: values.priorityOverride || "",
      };

      const response = await generateTaskSuggestions(nextRequest);
      setLastGenerationRequest(nextRequest);
      setGenerateTasksModalOpen(false);
      applyGeneratedTaskResponse(response);
      setReviewTasksModalOpen(true);
    } catch (error) {
      setGenerationError(getRequestErrorMessage(error));
    } finally {
      setIsGeneratingTasks(false);
    }
  }

  function closeReviewTasksModal() {
    setReviewTasksModalOpen(false);
    setGeneratedSummary("");
    setReviewError("");
    reviewTasksForm.resetFields();
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

  function handleReviewSelection(selectAll) {
    const suggestions = reviewTasksForm.getFieldValue("suggestions") || [];
    reviewTasksForm.setFieldsValue({
      suggestions: suggestions.map((suggestion) => ({
        ...suggestion,
        selected: selectAll,
      })),
    });
  }

  function handleImportGeneratedTasks(values) {
    const suggestions = (values.suggestions || [])
      .filter((suggestion) => suggestion?.selected !== false)
      .map((suggestion) => normalizeGeneratedSuggestion(suggestion))
      .filter(Boolean);

    if (!generationTargetInitiativeId) {
      setReviewError("No initiative is selected for generated tasks.");
      return;
    }

    if (suggestions.length === 0) {
      setReviewError("Add at least one suggested task before importing.");
      return;
    }

    const nextState = structuredClone(state);
    const initiative = nextState.initiatives.find(
      (item) => item.id === generationTargetInitiativeId,
    );
    if (!initiative) {
      setReviewError("The target initiative no longer exists.");
      return;
    }

    const now = new Date().toISOString();
    const createdCards = suggestions.map((suggestion) => ({
      id: createId("card"),
      title: suggestion.title,
      details: suggestion.details,
      memory: suggestion.notes,
      priority: suggestion.priority,
      column: "backlog",
      updatedAt: now,
    }));

    initiative.cards.push(...createdCards);
    nextState.activeInitiativeId = initiative.id;
    remember(
      nextState,
      `Imported ${createdCards.length} generated task${createdCards.length === 1 ? "" : "s"}`,
      generatedSummary || `Added generated tasks to ${initiative.name}.`,
    );

    commit(nextState);
    setCardTargetInitiativeId(initiative.id);
    closeReviewTasksModal();
  }

  function openEditCardModal(initiativeId, card) {
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
      priority: card.priority || "p2",
    });
    setCardModalOpen(true);
  }

  function closeCardModal() {
    setCardModalOpen(false);
    setEditingCard(null);
    cardForm.resetFields(["title", "details", "notes", "priority"]);
  }

  function setSwimlaneFilter(initiativeId) {
    setFilterInitiativeId(initiativeId);
    if (initiativeId) {
      setActiveInitiative(initiativeId);
      setExpandedInitiativeIds((current) =>
        current.includes(initiativeId) ? current : [initiativeId, ...current],
      );
    }
  }

  function setActiveInitiative(initiativeId) {
    setState((current) => ({
      ...current,
      activeInitiativeId: initiativeId,
    }));
  }

  function handleDrop(targetInitiativeId, targetColumnId) {
    if (!dragRef.current) return;

    const { cardId, sourceInitiativeId } = dragRef.current;
    const nextState = structuredClone(state);
    const sourceInitiative = nextState.initiatives.find(
      (initiative) => initiative.id === sourceInitiativeId,
    );
    const targetInitiative = nextState.initiatives.find(
      (initiative) => initiative.id === targetInitiativeId,
    );

    if (!sourceInitiative || !targetInitiative) return;

    const sourceIndex = sourceInitiative.cards.findIndex(
      (card) => card.id === cardId,
    );
    if (sourceIndex === -1) return;

    const sourceCard = sourceInitiative.cards[sourceIndex];
    if (
      sourceInitiativeId === targetInitiativeId &&
      sourceCard.column === targetColumnId
    ) {
      return;
    }

    const [card] = sourceInitiative.cards.splice(sourceIndex, 1);
    const previousColumn = getColumnTitle(card.column);
    const nextColumn = getColumnTitle(targetColumnId);
    const movedAcrossInitiatives = sourceInitiativeId !== targetInitiativeId;
    const shouldCelebrate =
      sourceCard.column !== "done" && targetColumnId === "done";

    card.column = targetColumnId;
    card.updatedAt = new Date().toISOString();
    targetInitiative.cards.push(card);
    nextState.activeInitiativeId = targetInitiativeId;

    remember(
      nextState,
      `Moved "${card.title}" to ${nextColumn}`,
      movedAcrossInitiatives
        ? `Reassigned from ${sourceInitiative.name} to ${targetInitiative.name}, from ${previousColumn} to ${nextColumn}.`
        : `Transitioned from ${previousColumn} in ${targetInitiative.name}.`,
    );

    commit(nextState);
    if (shouldCelebrate) {
      launchCelebration();
    }
  }

  function handleDeleteCard(initiativeId, cardId) {
    const nextState = structuredClone(state);
    const initiative = nextState.initiatives.find(
      (item) => item.id === initiativeId,
    );
    if (!initiative) return;

    const index = initiative.cards.findIndex((card) => card.id === cardId);
    if (index === -1) return;

    const [deleted] = initiative.cards.splice(index, 1);
    nextState.activeInitiativeId = initiativeId;
    remember(
      nextState,
      `Deleted "${deleted.title}"`,
      `Removed from ${initiative.name}.`,
    );
    commit(nextState);
  }

  function handleDeleteInitiative(initiativeId) {
    const initiative = state.initiatives.find((item) => item.id === initiativeId);
    if (!initiative) return;
    if (!window.confirm(`Delete initiative "${initiative.name}" and all its cards?`)) {
      return;
    }

    const nextInitiatives = state.initiatives.filter(
      (item) => item.id !== initiativeId,
    );
    const nextActiveInitiativeId = nextInitiatives[0]?.id || "";
    const nextState = {
      ...state,
      activeInitiativeId: nextActiveInitiativeId,
      initiatives: nextInitiatives,
      activity: [...state.activity],
    };

    remember(
      nextState,
      `Deleted initiative "${initiative.name}"`,
      `Removed ${initiative.cards.length} card${initiative.cards.length === 1 ? "" : "s"}.`,
    );

    commit(nextState);
    if (filterInitiativeId === initiativeId) {
      setFilterInitiativeId(null);
    }
    if (cardTargetInitiativeId === initiativeId) {
      setCardTargetInitiativeId(nextActiveInitiativeId);
    }
    if (editingInitiative?.id === initiativeId) {
      closeInitiativeModal();
    }
  }

  function reorderInitiatives(sourceInitiativeId, targetInitiativeId) {
    if (!sourceInitiativeId || !targetInitiativeId) return;
    if (sourceInitiativeId === targetInitiativeId) return;

    const currentIndex = state.initiatives.findIndex(
      (initiative) => initiative.id === sourceInitiativeId,
    );
    const targetIndex = state.initiatives.findIndex(
      (initiative) => initiative.id === targetInitiativeId,
    );
    if (currentIndex === -1 || targetIndex === -1) return;

    const nextInitiatives = [...state.initiatives];
    const [moved] = nextInitiatives.splice(currentIndex, 1);
    nextInitiatives.splice(targetIndex, 0, moved);

    const nextState = {
      ...state,
      initiatives: nextInitiatives,
      activity: [...state.activity],
    };

    remember(
      nextState,
      `Reordered initiative "${moved.name}"`,
      `Priority changed in the initiative list.`,
    );
    commit(nextState);
  }

  function handleReset() {
    if (!window.confirm("Reset all initiatives, cards, and memory?")) return;
    const nextState = createInitialState();
    remember(nextState, "Reset workspace", "Started over with a fresh board.");
    commit(nextState);
    setCardTargetInitiativeId(nextState.activeInitiativeId);
  }

  function launchCelebration() {
    const celebrationId = createId("celebration");
    const celebration = {
      id: celebrationId,
      particles: Array.from({ length: 28 }, (_, index) => ({
        id: `${celebrationId}-${index}`,
        left: `${4 + Math.random() * 92}%`,
        delay: `${index * 28}ms`,
        duration: `${1100 + Math.random() * 700}ms`,
        drift: `${-140 + Math.random() * 280}px`,
        rotation: `${-220 + Math.random() * 440}deg`,
        size: `${8 + Math.random() * 10}px`,
        color: pickCelebrationColor(index),
        shape: index % 5 === 0 ? "capsule" : index % 2 === 0 ? "square" : "circle",
      })),
    };

    setCelebrations((current) => [...current, celebration]);
    window.setTimeout(() => {
      setCelebrations((current) =>
        current.filter((item) => item.id !== celebrationId),
      );
    }, 2200);
  }

  async function generateTaskSuggestions(request) {
    const response = await requestJson(AI_GENERATE_TASKS_ENDPOINT, "POST", {
      initiativeId: request.initiativeId,
      instructions: request.instructions,
    });

    return {
      ...response,
      suggestions: (response.suggestions || []).map((suggestion) =>
        normalizeGeneratedSuggestion(suggestion, {
          selected: true,
          priorityOverride: request.priorityOverride,
        }),
      ).filter(Boolean),
    };
  }

  function applyGeneratedTaskResponse(response) {
    setGeneratedSummary(clampText(response.rawSummary || "", 600));
    setReviewError("");
    reviewTasksForm.setFieldsValue({
      suggestions: response.suggestions,
    });
  }

  return (
    <ConfigProvider theme={themeConfig}>
      <AntApp>
        <Layout className="app-layout">
      <Sider width={320} theme="light" className="app-sider">
        <div className="brand-block">
          <div className="brand-topbar">
            <Space size={8} wrap>
              <Tag color="blue">Work board</Tag>
              <Tag>{isDarkMode ? "Night" : "Day"}</Tag>
            </Space>
            <Space size={8}>
              <Text type="secondary" className="theme-toggle-label">
                Night mode
              </Text>
              <Switch checked={isDarkMode} onChange={setIsDarkMode} />
            </Space>
          </div>
          <Title level={3} className="brand-title">
            Trello-Do
          </Title>
          <Paragraph className="brand-copy">
            Initiative swimlanes with persistent context. The board is the
            primary working surface.
          </Paragraph>
          {saveError ? (
            <Text type="danger" className="brand-copy">
              {saveError}
            </Text>
          ) : null}
        </div>

        <Card
          size="small"
          title="Initiatives"
          extra={
            <Space size={4}>
              <Button
                type="text"
                disabled={!activeInitiative || isLoadingState}
                onClick={() => openGenerateTasksModal(activeInitiative?.id)}
              >
                Generate
              </Button>
              <Button type="text" onClick={openInitiativeModal}>
                New
              </Button>
            </Space>
          }
          className="panel-card"
        >
          <button
            type="button"
            className={`initiative-button initiative-filter-button${
              filterInitiativeId === null ? " active" : ""
            }`}
            onClick={() => setSwimlaneFilter(null)}
          >
            <div className="initiative-button-row">
              <Text strong>All initiatives</Text>
              <Badge
                count={state.initiatives.length}
                color="#cfd4dc"
                style={{ color: "#101828" }}
              />
            </div>
            <Text type="secondary" className="initiative-goal-text">
              Show every swimlane on the board.
            </Text>
          </button>

          <List
            dataSource={state.initiatives}
            locale={{ emptyText: "No initiatives yet" }}
            renderItem={(initiative) => {
              const doneCount = initiative.cards.filter(
                (card) => card.column === "done",
              ).length;
              return (
                <List.Item className="initiative-list-item">
                  <button
                    type="button"
                    draggable
                    className={`initiative-button${
                      filterInitiativeId === initiative.id ? " active" : ""
                    }`}
                    onClick={() => setSwimlaneFilter(initiative.id)}
                    onDragStart={() => {
                      initiativeDragRef.current = initiative.id;
                    }}
                    onDragEnd={() => {
                      initiativeDragRef.current = null;
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      reorderInitiatives(initiativeDragRef.current, initiative.id);
                      initiativeDragRef.current = null;
                    }}
                  >
                    <div className="initiative-button-row">
                      <Text strong>{initiative.name}</Text>
                      <Badge
                        count={initiative.cards.length}
                        color="#cfd4dc"
                        style={{ color: "#101828" }}
                      />
                    </div>
                    <Text type="secondary" className="initiative-goal-text">
                      {initiative.goal || "No initiative goal yet."}
                    </Text>
                    <div className="initiative-button-row initiative-foot">
                      <Space size={8} wrap>
                        <Text type="secondary">
                          {doneCount}/{Math.max(initiative.cards.length, 1)} shipped
                        </Text>
                        {initiative.id === state.activeInitiativeId ? (
                          <Tag color="blue" bordered={false}>
                            Target
                          </Tag>
                        ) : null}
                      </Space>
                      <Text type="secondary">{formatShortDate(initiative.createdAt)}</Text>
                    </div>
                  </button>
                </List.Item>
              );
            }}
          />
        </Card>

        <Card
          size="small"
          title="Memory"
          extra={
            <Button danger type="text" onClick={handleReset}>
              Reset
            </Button>
          }
          className="panel-card"
        >
          <Row gutter={[12, 12]} className="memory-stats">
            <Col span={12}>
              <Statistic title="Initiatives" value={state.initiatives.length} />
            </Col>
            <Col span={12}>
              <Statistic title="Cards" value={totalCards} />
            </Col>
            <Col span={12}>
              <Statistic title="In Progress" value={inProgressCards} />
            </Col>
            <Col span={12}>
              <Statistic title="Done" value={doneCards} />
            </Col>
          </Row>
          <List
            size="small"
            className="activity-list"
            dataSource={state.activity}
            locale={{ emptyText: "Memory feed is empty" }}
            renderItem={(entry) => (
              <List.Item className="activity-item">
                <div>
                  <Text strong>{entry.title}</Text>
                  <Paragraph className="activity-context">
                    {entry.context}
                  </Paragraph>
                  <Text type="secondary">{formatDateTime(entry.at)}</Text>
                </div>
              </List.Item>
            )}
          />
        </Card>
      </Sider>

      <Layout>
        <Content className="app-content">
          <Card
            className="board-card"
            title="Swimlane board"
            extra={
              <Space size={8} wrap>
                <Tag bordered={false} className="header-tag">
                  {totalCards} cards
                </Tag>
                <Tag bordered={false} className="header-tag">
                  {inProgressCards} in progress
                </Tag>
                <Tag bordered={false} color="success" className="header-tag">
                  {doneCards} done
                </Tag>
              </Space>
            }
          >
            <div className="board-lanes">
              {visibleInitiatives.length === 0 ? (
                <Empty
                  description={
                    isLoadingState
                      ? "Loading workspace..."
                      : "No initiatives match the current filter."
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <>
                  {visibleInitiatives.map((initiative) => {
                    const laneDoneCount = initiative.cards.filter(
                      (card) => card.column === "done",
                    ).length;
                    const isExpanded = expandedInitiativeIds.includes(initiative.id);

                    return (
                      <section
                        key={initiative.id}
                        className={`swimlane${isExpanded ? " expanded" : " collapsed"}`}
                      >
                        <div className="swimlane-toolbar">
                          <button
                            type="button"
                            className="swimlane-toggle"
                            onClick={() =>
                              setExpandedInitiativeIds((current) =>
                                current.includes(initiative.id)
                                  ? current.filter((id) => id !== initiative.id)
                                  : [...current, initiative.id],
                              )
                            }
                          >
                            {isExpanded ? <DownOutlined /> : <RightOutlined />}
                          </button>

                          <div className="swimlane-header">
                            <div className="swimlane-title-block">
                              <div className="swimlane-title-row">
                                <Title level={4} className="swimlane-title">
                                  {initiative.name}
                                </Title>
                              </div>
                              {isExpanded ? (
                                <Paragraph className="swimlane-copy">
                                  {initiative.goal || "No initiative goal yet."}
                                </Paragraph>
                              ) : null}
                            </div>

                            <Space wrap className="swimlane-actions">
                              <Tag className="swimlane-meta-tag">
                                {initiative.cards.length} cards
                              </Tag>
                              <Tag className="swimlane-meta-tag">
                                {
                                  initiative.cards.filter(
                                    (card) => card.column === "in-progress",
                                  ).length
                                }{" "}
                                in motion
                              </Tag>
                              <Tag color="success" className="swimlane-meta-tag">
                                {laneDoneCount} done
                              </Tag>
                              <Button
                                icon={<EditOutlined />}
                                onClick={() => openEditInitiativeModal(initiative)}
                              >
                                Edit
                              </Button>
                              <Button onClick={() => openGenerateTasksModal(initiative.id)}>
                                Generate tasks
                              </Button>
                              <Button
                                danger
                                onClick={() => handleDeleteInitiative(initiative.id)}
                              >
                                Delete
                              </Button>
                              <Button type="primary" onClick={() => openCardModal(initiative.id)}>
                                Add card
                              </Button>
                            </Space>
                          </div>
                        </div>

                        {isExpanded ? (
                          <div className="swimlane-body">
                            <div className="lane-grid">
                              {COLUMN_DEFS.map((column) => {
                                const cards = initiative.cards
                                  .filter((card) => card.column === column.id)
                                  .sort(compareCardsByPriority);

                                return (
                                  <div
                                    key={`${initiative.id}-${column.id}`}
                                    className={`lane-column lane-column-${column.id}`}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={() => handleDrop(initiative.id, column.id)}
                                  >
                                    <div className="lane-column-header">
                                      <Space align="center" size={8}>
                                        <Badge color={columnBadgeColor(column.id)} />
                                        <Text strong>{column.title}</Text>
                                      </Space>
                                      <Tag>{cards.length}</Tag>
                                    </div>

                                    <div className="lane-column-body">
                                      {cards.length === 0 ? (
                                        <Empty
                                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                                          description={`No cards in ${column.title.toLowerCase()}`}
                                        />
                                      ) : (
                                        cards.map((card) => {
                                          const notesExpanded =
                                            expandedNotesCardIds.includes(card.id);

                                          return (
                                            <Card
                                              key={card.id}
                                              size="small"
                                              className="work-card"
                                              draggable
                                              onClick={() =>
                                                openEditCardModal(initiative.id, card)
                                              }
                                              onDragStart={() => {
                                                dragRef.current = {
                                                  cardId: card.id,
                                                  sourceInitiativeId: initiative.id,
                                                };
                                              }}
                                              onDragEnd={() => {
                                                dragRef.current = null;
                                              }}
                                            >
                                              <div className="work-card-top">
                                                <div className="work-card-title-block">
                                                  <Text strong className="work-card-title">
                                                    {card.title}
                                                  </Text>
                                                  <Space
                                                    wrap
                                                    size={[8, 8]}
                                                    className="work-card-meta"
                                                  >
                                                    <Tag
                                                      color={getPriorityColor(card.priority)}
                                                      bordered={false}
                                                      className="work-card-priority"
                                                    >
                                                      {getPriorityLabel(card.priority)}
                                                    </Tag>
                                                  </Space>
                                                </div>

                                                <div className="work-card-actions">
                                                  <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<EditOutlined />}
                                                    className="work-card-edit"
                                                    onClick={(event) => {
                                                      event.stopPropagation();
                                                      openEditCardModal(initiative.id, card);
                                                    }}
                                                  />

                                                  <Button
                                                    type="text"
                                                    danger
                                                    size="small"
                                                    icon={<DeleteOutlined />}
                                                    className="work-card-delete"
                                                    onClick={(event) => {
                                                      event.stopPropagation();
                                                      handleDeleteCard(initiative.id, card.id);
                                                    }}
                                                  />
                                                </div>
                                              </div>

                                              <div className="work-card-section">
                                                <Text className="work-card-label">Details</Text>
                                                <Paragraph
                                                  className={`work-card-copy${
                                                    card.details ? "" : " is-placeholder"
                                                  }`}
                                                >
                                                  {card.details || "No details added yet."}
                                                </Paragraph>
                                              </div>

                                              {card.memory ? (
                                                <div className="work-card-notes">
                                                  <button
                                                    type="button"
                                                    className="work-card-notes-toggle"
                                                    onClick={(event) => {
                                                      event.stopPropagation();
                                                      setExpandedNotesCardIds((current) =>
                                                        current.includes(card.id)
                                                          ? current.filter((id) => id !== card.id)
                                                          : [...current, card.id],
                                                      );
                                                    }}
                                                  >
                                                    <Text className="work-card-label">Notes</Text>
                                                    {notesExpanded ? (
                                                      <DownOutlined />
                                                    ) : (
                                                      <RightOutlined />
                                                    )}
                                                  </button>
                                                  {notesExpanded ? (
                                                    <Paragraph className="work-card-notes-copy">
                                                      {card.memory}
                                                    </Paragraph>
                                                  ) : null}
                                                </div>
                                              ) : null}
                                            </Card>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </section>
                    );
                  })}
                </>
              )}
            </div>
          </Card>
        </Content>
      </Layout>

      <Modal
        destroyOnHidden
        okText={editingInitiative ? "Save changes" : "Save initiative"}
        onCancel={closeInitiativeModal}
        onOk={() => initiativeForm.submit()}
        open={initiativeModalOpen}
        title={editingInitiative ? "Edit initiative" : "Create initiative"}
      >
        <Form form={initiativeForm} layout="vertical" onFinish={handleSaveInitiative}>
          <Form.Item
            label="Initiative name"
            name="name"
            rules={[{ required: true, message: "Enter an initiative name" }]}
          >
            <Input
              ref={initiativeNameInputRef}
              maxLength={60}
              placeholder="Quarterly planning"
            />
          </Form.Item>
          <Form.Item label="Goal" name="goal">
            <Input.TextArea
              maxLength={220}
              rows={4}
              placeholder="State the outcome this initiative should produce."
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        destroyOnHidden
        okText={editingCard ? "Save changes" : "Create card"}
        onCancel={closeCardModal}
        onOk={() => cardForm.submit()}
        open={cardModalOpen}
        title={
          editingCard
            ? "Edit card"
            : cardTargetInitiative
              ? `Create card for ${cardTargetInitiative.name}`
              : "Create card"
        }
      >
        <Form
          form={cardForm}
          layout="vertical"
          onFinish={handleSaveCard}
        >
          <Form.Item
            label="Card title"
            name="title"
            rules={[{ required: true, message: "Enter a card title" }]}
          >
            <Input
              ref={cardTitleInputRef}
              maxLength={80}
              placeholder="Prepare stakeholder review"
            />
          </Form.Item>
          <Form.Item label="Details" name="details">
            <Input.TextArea
              maxLength={280}
              rows={4}
              placeholder="Capture the work unit clearly."
            />
          </Form.Item>
          <Form.Item
            initialValue="p2"
            label="Priority"
            name="priority"
          >
            <Select
              options={CARD_PRIORITIES.map((priority) => ({
                label: `${priority.label} · ${priority.title}`,
                value: priority.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input
              maxLength={120}
              placeholder="Dependencies, blockers, decisions, or useful context."
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        destroyOnHidden
        confirmLoading={isGeneratingTasks}
        okText="Generate tasks"
        onCancel={closeGenerateTasksModal}
        onOk={() => generateTasksForm.submit()}
        open={generateTasksModalOpen}
        title={
          generationTargetInitiative
            ? `Generate tasks for ${generationTargetInitiative.name}`
            : "Generate tasks"
        }
      >
        <Form
          form={generateTasksForm}
          layout="vertical"
          onFinish={handleGenerateTasks}
        >
          {generationError ? (
            <Alert
              showIcon
              type="error"
              message="Generation failed"
              description={generationError}
              style={{ marginBottom: 16 }}
            />
          ) : null}
          <Form.Item label="Guidance" name="instructions">
            <Input.TextArea
              maxLength={500}
              rows={5}
              placeholder="Optional: mention constraints, sequencing, expected output, or areas that matter most."
            />
          </Form.Item>
          <Form.Item
            initialValue=""
            label="Priority target"
            name="priorityOverride"
          >
            <Select
              options={[
                { label: "Keep Claude priorities", value: "" },
                ...CARD_PRIORITIES.map((priority) => ({
                  label: `${priority.label} · ${priority.title}`,
                  value: priority.id,
                })),
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        destroyOnHidden
        confirmLoading={isGeneratingTasks}
        footer={[
          <Button key="regenerate" onClick={handleRegenerateTasks} loading={isGeneratingTasks}>
            Regenerate
          </Button>,
          <Button key="select-all" onClick={() => handleReviewSelection(true)}>
            Select all
          </Button>,
          <Button key="clear" onClick={() => handleReviewSelection(false)}>
            Clear
          </Button>,
          <Button key="cancel" onClick={closeReviewTasksModal}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={() => reviewTasksForm.submit()}>
            Add selected tasks
          </Button>,
        ]}
        width={920}
        onCancel={closeReviewTasksModal}
        open={reviewTasksModalOpen}
        title={
          generationTargetInitiative
            ? `Review generated tasks for ${generationTargetInitiative.name}`
            : "Review generated tasks"
        }
      >
        {generatedSummary ? (
          <Alert
            showIcon
            type="info"
            message="Claude summary"
            description={generatedSummary}
            style={{ marginBottom: 16 }}
          />
        ) : null}
        {reviewError ? (
          <Alert
            showIcon
            type="error"
            message="Cannot import tasks"
            description={reviewError}
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Form
          form={reviewTasksForm}
          layout="vertical"
          onFinish={handleImportGeneratedTasks}
        >
          <Form.List name="suggestions">
            {(fields, { remove }) => (
              <div className="generated-task-list">
                <div className="generated-task-toolbar">
                  <Text type="secondary">
                    {fields.length} suggestion{fields.length === 1 ? "" : "s"} ready for review.
                  </Text>
                </div>
                {fields.length === 0 ? (
                  <Empty
                    description="No suggested tasks to import."
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  fields.map((field) => (
                    <Card
                      key={field.key}
                      size="small"
                      className="generated-task-card"
                      extra={
                        <Button type="text" danger onClick={() => remove(field.name)}>
                          Remove
                        </Button>
                      }
                    >
                      <Form.Item
                        className="generated-task-checkbox"
                        name={[field.name, "selected"]}
                        valuePropName="checked"
                      >
                        <Checkbox>Include this task</Checkbox>
                      </Form.Item>
                      <Form.Item
                        label="Title"
                        name={[field.name, "title"]}
                        rules={[{ required: true, message: "Enter a task title" }]}
                      >
                        <Input maxLength={120} />
                      </Form.Item>
                      <Form.Item label="Details" name={[field.name, "details"]}>
                        <Input.TextArea maxLength={400} rows={3} />
                      </Form.Item>
                      <Form.Item label="Priority" name={[field.name, "priority"]}>
                        <Select
                          options={CARD_PRIORITIES.map((priority) => ({
                            label: `${priority.label} · ${priority.title}`,
                            value: priority.id,
                          }))}
                        />
                      </Form.Item>
                      <Form.Item label="Notes" name={[field.name, "notes"]}>
                        <Input.TextArea maxLength={240} rows={2} />
                      </Form.Item>
                    </Card>
                  ))
                )}
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
      <div className="celebration-layer" aria-hidden="true">
        {celebrations.map((celebration) => (
          <div key={celebration.id} className="celebration-burst">
            <div className="celebration-flash" />
            <div className="celebration-toast">Done</div>
            {celebration.particles.map((particle) => (
              <span
                key={particle.id}
                className="celebration-particle"
                style={{
                  "--left": particle.left,
                  "--delay": particle.delay,
                  "--duration": particle.duration,
                  "--drift": particle.drift,
                  "--rotation": particle.rotation,
                  "--size": particle.size,
                  "--color": particle.color,
                }}
                data-shape={particle.shape}
              />
            ))}
          </div>
        ))}
      </div>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}

function loadThemePreference() {
  return window.localStorage.getItem(THEME_KEY) === "dark";
}

async function requestJson(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    const requestError = new Error(
      payload?.detail || payload?.error || `Request failed with status ${response.status}`,
    );
    requestError.status = response.status;
    requestError.payload = payload;
    throw requestError;
  }

  return response.json();
}

async function requestWorkspace(method, body) {
  return requestJson(WORKSPACE_ENDPOINT, method, body);
}

function createEmptyState() {
  return {
    activeInitiativeId: "",
    initiatives: [],
    activity: [],
  };
}

function createInitialState() {
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
          {
            id: createId("card"),
            title: "Finalize launch timeline",
            details: "Confirm milestone owners, review dependencies, and publish the release path.",
            memory: "Marketing sign-off is required before the public date is committed.",
            priority: "p1",
            column: "in-progress",
            updatedAt: now,
          },
          {
            id: createId("card"),
            title: "Approve support briefing",
            details: "Align response templates, escalation routes, and rollout messaging.",
            memory: "Support wants final screenshots from product before publishing.",
            priority: "p1",
            column: "in-progress",
            updatedAt: now,
          },
          {
            id: createId("card"),
            title: "Run payment regression",
            details: "Execute checkout coverage with production-like scenarios.",
            memory: "Last issue came from coupon handling on mobile Safari.",
            priority: "p0",
            column: "backlog",
            updatedAt: now,
          },
        ],
      },
      {
        id: onboardingId,
        name: "Onboarding refresh",
        goal: "Increase early activation by simplifying the first-session path and reducing ambiguity.",
        createdAt: now,
        cards: [
          {
            id: createId("card"),
            title: "Instrument activation funnel",
            details: "Capture first project, first invite, and first completed workflow.",
            memory: "Metrics need to be in place before content changes ship.",
            priority: "p1",
            column: "backlog",
            updatedAt: now,
          },
          {
            id: createId("card"),
            title: "Rewrite empty states",
            details: "Replace generic copy with direct next actions tailored to role.",
            memory: "Tone should be factual and directive.",
            priority: "p2",
            column: "in-progress",
            updatedAt: now,
          },
          {
            id: createId("card"),
            title: "Prototype checklist reveal",
            details: "Test staged task exposure after workspace creation.",
            memory: "",
            priority: "p3",
            column: "done",
            updatedAt: now,
          },
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

function getColumnTitle(columnId) {
  return (
    COLUMN_DEFS.find((column) => column.id === columnId)?.title || columnId
  );
}

function columnBadgeColor(columnId) {
  switch (columnId) {
    case "backlog":
      return "#597ef7";
    case "in-progress":
      return "#13c2c2";
    case "done":
      return "#8c8c8c";
    default:
      return "#d9d9d9";
  }
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeState(state) {
  return {
    ...state,
    initiatives: (state.initiatives || []).map((initiative) => ({
      ...initiative,
      cards: (initiative.cards || []).map((card) => ({
        ...card,
        column: normalizeColumn(card.column),
        priority: isValidPriority(card.priority) ? card.priority : "p2",
      })),
    })),
    activity: Array.isArray(state.activity) ? state.activity : [],
    activeInitiativeId: typeof state.activeInitiativeId === "string"
      ? state.activeInitiativeId
      : "",
  };
}

function normalizeGeneratedSuggestion(suggestion, options = {}) {
  if (!suggestion || typeof suggestion !== "object") return null;
  const title = clampText(
    typeof suggestion.title === "string" ? suggestion.title.trim() : "",
    120,
  );
  if (!title) return null;

  return {
    title,
    details: clampText(
      typeof suggestion.details === "string" ? suggestion.details.trim() : "",
      400,
    ),
    priority: isValidPriority(options.priorityOverride)
      ? options.priorityOverride
      : isValidPriority(suggestion.priority)
        ? suggestion.priority
        : "p2",
    notes: clampText(
      typeof suggestion.notes === "string" ? suggestion.notes.trim() : "",
      240,
    ),
    selected: options.selected ?? suggestion.selected !== false,
  };
}

function clampText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function getRequestErrorMessage(error) {
  if (error?.payload?.error) {
    if (error.payload.detail && error.payload.detail !== error.payload.error) {
      return `${error.payload.error} ${error.payload.detail}`;
    }
    return error.payload.error;
  }
  return error?.message || "The request could not be completed.";
}

function normalizeColumn(columnId) {
  if (columnId === "review") return "in-progress";
  return COLUMN_DEFS.some((column) => column.id === columnId)
    ? columnId
    : "backlog";
}

function isValidPriority(priorityId) {
  return CARD_PRIORITIES.some((priority) => priority.id === priorityId);
}

function getPriority(priorityId) {
  return (
    CARD_PRIORITIES.find((priority) => priority.id === priorityId) ||
    CARD_PRIORITIES[2]
  );
}

function getPriorityLabel(priorityId) {
  const priority = getPriority(priorityId);
  return `${priority.label} ${priority.title}`;
}

function getPriorityColor(priorityId) {
  return getPriority(priorityId).color;
}

function compareCardsByPriority(left, right) {
  const rankDifference = getPriority(left.priority).rank - getPriority(right.priority).rank;
  if (rankDifference !== 0) return rankDifference;
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

function pickCelebrationColor(index) {
  const palette = [
    "#1677ff",
    "#14b8a6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#22c55e",
  ];
  return palette[index % palette.length];
}

function formatShortDate(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString();
}

function formatTimeAgo(dateString) {
  const delta = Date.now() - new Date(dateString).getTime();
  const minutes = Math.max(1, Math.floor(delta / 60000));
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
