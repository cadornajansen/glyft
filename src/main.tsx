import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./propertiesPanelPolish.css";
import { installColorInputCoalescing } from "./installColorInputCoalescing";
import { installCompactSelectionUI } from "./canvas/installCompactSelectionUI";
import { installElementContextMenu } from "./canvas/installElementContextMenu";
import { installTextPropertyPolish } from "./canvas/installTextPropertyPolish";

installColorInputCoalescing();
installCompactSelectionUI();
installElementContextMenu();
installTextPropertyPolish();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
