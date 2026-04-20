import { useEffect, useState } from "react";
import { THEME_KEY } from "@/shared/constants/app";
import { requestCapabilities, requestWorkspace } from "@/shared/api/workspace";
import type { CapabilitiesResponse, WorkspaceState } from "@/shared/types/workspace";
import { createInitialState, normalizeState } from "@/shared/state/workspace";

function loadThemePreference(): boolean {
  return window.localStorage.getItem(THEME_KEY) === "dark";
}

export function useWorkspace() {
  const [isDarkMode, setIsDarkMode] = useState(loadThemePreference);
  const [state, setState] = useState<WorkspaceState>(createInitialState);
  const [capabilities, setCapabilities] = useState<CapabilitiesResponse>({
    aiTaskGeneration: {
      enabled: true,
      reason: "",
    },
  });
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light");
    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  useEffect(() => {
    let isCancelled = false;

    async function loadWorkspaceState() {
      try {
        const [loadedWorkspace, loadedCapabilities] = await Promise.all([
          requestWorkspace("GET"),
          requestCapabilities(),
        ]);

        if (isCancelled) return;
        setState(normalizeState(loadedWorkspace));
        setCapabilities(loadedCapabilities);
        setSaveError("");
      } catch (error) {
        console.error("Failed to load workspace state.", error);
        if (isCancelled) return;
        setState(createInitialState());
        setCapabilities({
          aiTaskGeneration: {
            enabled: false,
            reason: "Capabilities could not be loaded.",
          },
        });
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
        .then(() => setSaveError(""))
        .catch((error) => {
          console.error("Failed to persist workspace state.", error);
          setSaveError("Changes are not being persisted to disk.");
        });
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoadingState, state]);

  return {
    capabilities,
    isDarkMode,
    isLoadingState,
    saveError,
    setIsDarkMode,
    setState,
    state,
  };
}
