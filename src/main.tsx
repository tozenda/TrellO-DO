import React from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "@/styles/index.css";
import WorkspaceApp from "@/app/App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WorkspaceApp />
  </React.StrictMode>,
);
