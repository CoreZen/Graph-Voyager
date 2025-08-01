import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

export default function ResultsPanel({
  algorithmState,
  selectedAlgorithm,
  startNode,
  endNode,
  nodes,
}) {
  // Progress calculation
  const totalNodes = nodes.length;
  const visitedCount = algorithmState.visited
    ? algorithmState.visited.size || Object.keys(algorithmState.visited).length
    : 0;
  const step = algorithmState.step || 0;

  // Current node label
  const currentNodeLabel =
    algorithmState.current &&
    nodes.find((n) => n.id === algorithmState.current)?.label;

  // Path labels
  const pathLabels =
    algorithmState.path && algorithmState.path.length > 0
      ? algorithmState.path
          .map((id) => nodes.find((n) => n.id === id)?.label || id)
          .join(" → ")
      : "None";

  // Visited nodes labels
  const visitedLabels =
    algorithmState.visited && algorithmState.visited.size > 0
      ? Array.from(algorithmState.visited)
          .map((id) => nodes.find((n) => n.id === id)?.label || id)
          .join(", ")
      : "None";

  // SCC results
  const showSCC =
    selectedAlgorithm === "scc" &&
    algorithmState.foundSccs &&
    algorithmState.foundSccs.length > 0;

  // SCC color mapping
  const sccColors = algorithmState.sccColors || {};

  // SCC list rendering
  const sccList = showSCC ? (
    <div className="mb-4">
      <div className="text-xs text-slate-400 mb-1">
        Strongly Connected Components
      </div>
      <div className="space-y-2">
        {algorithmState.foundSccs.map((scc, idx) => (
          <div key={idx} className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-300">
              SCC {idx + 1}:
            </span>
            {scc.map((nodeId) => {
              const node = nodes.find((n) => n.id === nodeId);
              return (
                <span
                  key={nodeId}
                  className="px-2 py-1 rounded text-xs font-semibold"
                  style={{
                    backgroundColor: sccColors[nodeId] || "#818cf8",
                    color: "#fff",
                  }}
                >
                  {node?.label || nodeId}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  // Algorithm phase/stage
  let phaseLabel = null;
  if (selectedAlgorithm === "scc") {
    switch (algorithmState.phase) {
      case "dfs1":
        phaseLabel = "Phase: First DFS (Original Graph)";
        break;
      case "transpose":
        phaseLabel = "Phase: Transpose Graph";
        break;
      case "dfs2":
        phaseLabel = "Phase: Second DFS (Transposed Graph)";
        break;
      case "finished":
        phaseLabel = "Phase: Finished";
        break;
      default:
        phaseLabel = null;
    }
  }

  // BFS queue
  const showQueue =
    selectedAlgorithm === "bfs" &&
    algorithmState.queue &&
    algorithmState.queue.length > 0;
  const queueLabels = showQueue
    ? algorithmState.queue
        .map((id) => nodes.find((n) => n.id === id)?.label || id)
        .join(", ")
    : null;

  // Dijkstra distances
  const showDistances =
    selectedAlgorithm === "dijkstra" &&
    algorithmState.distances &&
    Object.keys(algorithmState.distances).length > 0;
  const distanceList = showDistances ? (
    <div className="mb-2">
      <div className="text-xs text-slate-400 mb-1">Distances</div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(algorithmState.distances).map(([id, dist]) => {
          const node = nodes.find((n) => n.id === id);
          return (
            <span
              key={id}
              className="px-2 py-1 rounded text-xs font-semibold bg-yellow-500 text-slate-900"
            >
              {node?.label || id}: {dist === Infinity ? "∞" : dist}
            </span>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-200">Algorithm Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {phaseLabel && (
          <div className="mb-2 text-xs text-blue-400 font-semibold">
            {phaseLabel}
          </div>
        )}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Progress</span>
            <span className="text-xs text-slate-400">Step {step}</span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded">
            <div
              className="h-2 bg-blue-600 rounded"
              style={{
                width:
                  totalNodes > 0
                    ? `${Math.min((visitedCount / totalNodes) * 100, 100)}%`
                    : "0%",
              }}
            ></div>
          </div>
          <div className="text-xs mt-1 text-slate-400">
            {visitedCount} of {totalNodes} nodes visited
          </div>
        </div>
        <div className="mb-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Current Node:</span>
            <span className="font-semibold text-slate-200">
              {currentNodeLabel || "None"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs mt-1">
            <span className="text-slate-400">Path:</span>
            <span className="font-semibold text-blue-400">{pathLabels}</span>
          </div>
        </div>
        <div className="mb-2">
          <div className="text-xs text-slate-400 mb-1">Visited Nodes</div>
          <div className="text-xs text-slate-200">{visitedLabels}</div>
        </div>
        {showQueue && (
          <div className="mb-2">
            <div className="text-xs text-slate-400 mb-1">Queue</div>
            <div className="text-xs text-blue-300">{queueLabels}</div>
          </div>
        )}
        {distanceList}
        {sccList}
        {algorithmState.result && (
          <div className="mt-2 text-xs text-green-400 font-semibold">
            {algorithmState.result}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
