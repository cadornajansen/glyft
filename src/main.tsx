import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./propertiesPanelPolish.css";
import { installColorInputCoalescing } from "./installColorInputCoalescing";

installColorInputCoalescing();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
