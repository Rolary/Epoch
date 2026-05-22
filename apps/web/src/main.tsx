import React from "react";
import ReactDOM from "react-dom/client";
import { loadUiAssetUrlMap } from "./assets/uiAssets.js";
import "./styles/game.css";

await loadUiAssetUrlMap();
const { App } = await import("./App.js");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
