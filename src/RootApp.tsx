import React from "react";
import LandingPage from "./pages/LandingPage";
import EditorPage from "./pages/EditorPage";
import { resolveAppRoute } from "./routing";

export default function RootApp() {
  const route = resolveAppRoute(window.location.pathname);

  if (route === "editor") {
    return <EditorPage />;
  }

  return <LandingPage />;
}
