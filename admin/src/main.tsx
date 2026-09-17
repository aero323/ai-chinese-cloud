import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import "./styles.css";
import App from "./App";
import { platform } from "./lib/platform";
import { usePlatformStore } from "./store/usePlatformStore";

const initial = platform.getState();
usePlatformStore.getState().refresh(initial);

createRoot(document.getElementById("admin-root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
