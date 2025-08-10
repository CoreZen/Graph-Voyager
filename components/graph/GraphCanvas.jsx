import React, { useState } from "react";
import { Card } from "../ui/card";
import GraphCanvasView from "./GraphCanvasView";
import useScaledCoords from "./hooks/useScaledCoords";
import * as draw from "./draw/drawUtils";
import * as helpers from "./lib/stateNormalization";

/**
 * GraphCanvas
 *
 * A thin container component that composes the presentational/interactive
 * GraphCanvasView with injected utilities (SOLID-friendly).
 *
 * Responsibilities:
 * - Provide styling/card chrome
 * - Inject reusable modules:
 *   - useScaledCoords: canvas sizing + coordinate scaling hook
 *   - draw: pure drawing primitives for nodes/edges
 *   - helpers: state normalization and path reconstruction utilities
 * - Forward all graph/algorithm props to the view
 */
export default function GraphCanvas(props) {
  const [mode, setMode] = useState("select");
  return (
    <Card className="bg-slate-900/50 border-slate-700 p-4">
      <GraphCanvasView
        {...props}
        mode={mode}
        onChangeMode={setMode}
        utils={{
          useScaledCoords,
          draw,
          helpers,
        }}
      />
    </Card>
  );
}
