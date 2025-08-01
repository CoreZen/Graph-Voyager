import React from "react";
import ReactDOM from "react-dom/client";
import "./tailwind.css";
import GraphVisualizer from "./pages/GraphVisualizer.jsx";

// Ensure there's a div with id="root" in your index.html
const rootElement = document.getElementById("root");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <GraphVisualizer />
  </React.StrictMode>,
);
