import React, { useEffect } from "react";
import App from "../App.tsx";
import { installColorInputCoalescing } from "../installColorInputCoalescing";
import { installCompactSelectionUI } from "../canvas/installCompactSelectionUI";
import { installElementContextMenu } from "../canvas/installElementContextMenu";
import { installTextPropertyPolish } from "../canvas/installTextPropertyPolish";

import "../propertiesPanelPolish.css";
import "../sidebarPolish.css";

let hasInstalled = false;

function ensureInstalled() {
  if (hasInstalled) return;
  hasInstalled = true;
  installColorInputCoalescing();
  installCompactSelectionUI();
  installElementContextMenu();
  installTextPropertyPolish();
}

export default function EditorPage() {
  useEffect(() => {
    ensureInstalled();
  }, []);

  return <App />;
}
