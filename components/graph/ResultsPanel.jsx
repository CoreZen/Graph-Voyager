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

  // Path labels (normalize path whether it's an Array, Set, or keyed Object)
  const pathLabels = (() => {
    const rawPath = algorithmState.path;
    let pathArr = [];
    if (Array.isArray(rawPath)) {
      pathArr = rawPath;
    } else if (rawPath instanceof Set) {
      pathArr = Array.from(rawPath);
    } else if (rawPath && typeof rawPath === "object") {
      // If algorithm produced an object, prefer values if they look like an array; otherwise use keys
      const vals = Object.values(rawPath);
      pathArr =
        Array.isArray(vals) && vals.length > 0 ? vals : Object.keys(rawPath);
    }
    if (pathArr && pathArr.length > 0) {
      return pathArr
        .map((id) => nodes.find((n) => n.id === id)?.label || id)
        .join(" → ");
    }
    return "None";
  })();

  // Visited nodes labels (normalize visited whether it's Set, Array, or keyed Object)
  const visitedLabels = (() => {
    const rawVisited = algorithmState.visited;
    let visitedArr = [];
    if (rawVisited instanceof Set) {
      visitedArr = Array.from(rawVisited);
    } else if (Array.isArray(rawVisited)) {
      visitedArr = rawVisited.slice();
    } else if (rawVisited && typeof rawVisited === "object") {
      visitedArr = Object.keys(rawVisited);
    }
    if (visitedArr && visitedArr.length > 0) {
      return visitedArr
        .map((id) => nodes.find((n) => n.id === id)?.label || id)
        .join(", ");
    }
    return "None";
  })();

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
    ? (() => {
        const qRaw = algorithmState.queue;
        let qArr = [];
        if (Array.isArray(qRaw)) {
          qArr = qRaw;
        } else if (qRaw instanceof Set) {
          qArr = Array.from(qRaw);
        } else if (qRaw && typeof qRaw === "object") {
          const vals = Object.values(qRaw);
          qArr =
            Array.isArray(vals) && vals.length > 0 ? vals : Object.keys(qRaw);
        }
        return qArr
          .map((id) => nodes.find((n) => n.id === id)?.label || id)
          .join(", ");
      })()
    : null;

  // Distances (Dijkstra & Bellman-Ford)
  // Support both Dijkstra and Bellman-Ford so distances appear for both algorithms.
  const showDistances =
    (selectedAlgorithm === "dijkstra" || selectedAlgorithm === "bellmanFord") &&
    algorithmState.distances &&
    Object.keys(algorithmState.distances).length > 0;
  const distanceList = showDistances ? (
    <div className="mb-2">
      <div className="text-xs text-slate-400 mb-1">
        {selectedAlgorithm === "bellmanFord"
          ? "Distances (Bellman-Ford)"
          : "Distances"}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(algorithmState.distances).map(([id, dist]) => {
          const node = nodes.find((n) => n.id === id);
          return (
            <span
              key={id}
              className="px-2 py-1 rounded text-xs font-semibold bg-amber-300 text-slate-900 shadow-sm"
              title={`Node ${node?.label || id} — ${dist === Infinity ? "∞" : dist}`}
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
        {/* Topological order display (if algorithm emitted `order`) */}
        {algorithmState.order && algorithmState.order.length > 0 && (
          <div className="mb-2">
            <div className="text-xs text-slate-400 mb-1">Topological Order</div>
            <div className="text-xs text-green-300 font-semibold">
              {algorithmState.order
                .map((id) => nodes.find((n) => n.id === id)?.label || id)
                .join(" → ")}
            </div>
          </div>
        )}
        {/* Topological order violations (if any) */}
        {algorithmState.orderViolations &&
          algorithmState.orderViolations.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-rose-300 mb-2 font-medium">
                Order Violations
              </div>
              <div className="space-y-2">
                {algorithmState.orderViolations.map((v, idx) => {
                  const fromLabel =
                    nodes.find((n) => n.id === v.from)?.label || v.from;
                  const toLabel =
                    nodes.find((n) => n.id === v.to)?.label || v.to;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="px-2 py-1 rounded bg-rose-600/10 border border-rose-600/20 text-rose-200 text-xs font-semibold">
                        {fromLabel} → {toLabel}
                      </div>
                      <div className="text-xs text-rose-300">
                        from index {v.fromIndex} &ge; to index {v.toIndex}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        {algorithmState.result && (
          <div className="mt-2 text-xs text-green-400 font-semibold">
            {algorithmState.result}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
