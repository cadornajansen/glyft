import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./propertiesPanelPolish.css";
import { installColorInputCoalescing } from "./installColorInputCoalescing";
import { installCompactSelectionUI } from "./canvas/installCompactSelectionUI";

installColorInputCoalescing();
installCompactSelectionUI();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
