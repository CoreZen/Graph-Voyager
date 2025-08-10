import React, { useState, useCallback, useRef, useEffect } from "react";
import { Card } from "../components/ui/card";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
import { Play, Pause, RotateCcw, Save, Upload, Settings } from "lucide-react";

import GraphCanvas from "../components/graph/GraphCanvas";
import AlgorithmControls from "../components/graph/AlgorithmControls";
import NodeEdgeManager from "../components/graph/NodeEdgeManager";
import ResultsPanel from "../components/graph/ResultsPanel";
import algoLib from "../algorithms";

export default function GraphVisualizer() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isDirected, setIsDirected] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("bfs");
  const [isPlaying, setIsPlaying] = useState(false);
  const [algorithmState, setAlgorithmState] = useState({
    visited: new Set(),
    current: null,
    path: [],
    distances: {},
    queue: [],
    step: 0,
    finished: false,
    result: null,
    // SCC specific state
    phase: null,
    finishOrderStack: [],
    foundSccs: [],
    sccColors: {},
    showTransposed: false,
    // Discovery/Finish Times
    discoveryTimes: {},
    finishTimes: {},
    // Topological order validation results (array of violating edges)
    orderViolations: [],
  });
  const [animationSpeed, setAnimationSpeed] = useState(500);
  const [startNode, setStartNode] = useState(null);
  const [endNode, setEndNode] = useState(null);
  const intervalRef = useRef(null);

  const algorithms = {
    bfs: {
      name: "Breadth-First Search",
      color: "#3b82f6",
      description:
        "Explores nodes level by level. Finds shortest unweighted path. Time: O(V + E), Space: O(V).",
    },
    dfs: {
      name: "Depth-First Search",
      color: "#10b981",
      description:
        "Explores as far as possible first. Useful for connectivity, cycles and discovery/finish times. Time: O(V + E), Space: O(V).",
    },
    dijkstra: {
      name: "Dijkstra's Algorithm",
      color: "#f59e0b",
      description:
        "Finds shortest weighted path (non-negative weights). Good for single-source shortest paths. Time: O(V²) in this implementation, Space: O(V).",
    },
    scc: {
      name: "Strongly Connected Components",
      color: "#8b5cf6",
      description:
        "Finds strongly connected components using Kosaraju's algorithm. Visualized in two DFS passes and a transpose phase. Time: O(V + E), Space: O(V).",
    },
    bellmanFord: {
      name: "Bellman-Ford",
      color: "#f97316",
      description:
        "Shortest paths allowing negative edge weights and detects negative cycles. Slower than Dijkstra for non-negative graphs. Time: O(V * E), Space: O(V).",
    },
    topologicalSort: {
      name: "Topological Sort",
      color: "#06b6d4",
      description:
        "Computes a topological ordering of a DAG using Kahn's algorithm. If a cycle exists, topological sorting is not possible.",
    },
  };

  const resetAlgorithmState = useCallback(() => {
    setAlgorithmState({
      visited: new Set(),
      current: null,
      path: [],
      distances: {},
      queue: [],
      step: 0,
      finished: false,
      result: null,
      phase: null,
      finishOrderStack: [],
      foundSccs: [],
      sccColors: {},
      showTransposed: false,
      discoveryTimes: {},
      finishTimes: {},
      orderViolations: [],
    });
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  // Delegate algorithm implementations to centralized algorithms library
  const getAlgorithmSteps = useCallback(
    (algoKey, nodesArg, edgesArg, startNodeId, endNodeId) => {
      const fn = algoLib[algoKey];
      if (!fn) {
        console.warn(`Algorithm not found: ${algoKey}`);
        return [{ finished: true }];
      }
      try {
        return fn(nodesArg, edgesArg, {
          isDirected,
          startNode: startNodeId,
          endNode: endNodeId,
        });
      } catch (err) {
        console.error("Algorithm execution error:", err);
        return [{ finished: true }];
      }
    },
    [isDirected],
  );

  const playAlgorithm = useCallback(() => {
    if ((!startNode && selectedAlgorithm !== "scc") || nodes.length === 0)
      return;

    resetAlgorithmState();
    let steps = [];

    try {
      // Centralized algorithm dispatcher
      if (selectedAlgorithm === "dijkstra" && !endNode) {
        alert("Please select an end node for Dijkstra's Algorithm.");
        return;
      }
      if (selectedAlgorithm === "bellmanFord" && !endNode) {
        // Require explicit end node for Bellman-Ford (matches Dijkstra behavior)
        alert("Please select an end node for Bellman-Ford.");
        return;
      }
      if (selectedAlgorithm === "scc" && !isDirected) {
        alert(
          "Strongly Connected Components algorithm is designed for directed graphs. Please enable 'Directed Graph' mode.",
        );
        return;
      }

      steps = getAlgorithmSteps(
        selectedAlgorithm,
        nodes,
        edges,
        startNode,
        endNode,
      );

      // Topological sort: validate final order (if any) against edges and expose violations
      if (selectedAlgorithm === "topologicalSort") {
        try {
          const finalStep =
            [...steps]
              .reverse()
              .find((s) => s && s.order && s.order.length > 0) ||
            steps[steps.length - 1] ||
            {};
          const order = finalStep && finalStep.order ? finalStep.order : [];
          const pos = {};
          order.forEach((id, idx) => {
            pos[id] = idx;
          });
          const violations = [];
          edges.forEach((e) => {
            // only validate directed edges (topological sort is for directed graphs)
            if (!isDirected) return;
            const fromPos = pos[e.from];
            const toPos = pos[e.to];
            // If either node isn't in the order (e.g., isolated or missing), skip
            if (fromPos === undefined || toPos === undefined) return;
            if (fromPos >= toPos) {
              violations.push({
                edgeId: e.id || `${e.from}->${e.to}`,
                from: e.from,
                to: e.to,
                fromIndex: fromPos,
                toIndex: toPos,
              });
            }
          });
          setAlgorithmState((prev) => ({
            ...prev,
            orderViolations: violations,
          }));
        } catch (err) {
          // defensive: don't block algorithm playback if validation fails
          console.warn("Topological validation error:", err);
          setAlgorithmState((prev) => ({ ...prev, orderViolations: [] }));
        }
      }
    } catch (error) {
      console.error("Algorithm error:", error);
      alert(
        "An error occurred during algorithm execution. Check console for details.",
      );
      return;
    }

    setIsPlaying(true);
    let stepIndex = 0;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (stepIndex < steps.length) {
        const rawStep = steps[stepIndex];

        // Use functional update so we can merge/normalize relative to previous state
        setAlgorithmState((prev) => {
          const step = rawStep || {};
          const next = { ...prev };

          // Normalize visited -> always a Set on state
          let visitedSet;
          if (step.visited instanceof Set) {
            visitedSet = new Set(step.visited);
          } else if (Array.isArray(step.visited)) {
            visitedSet = new Set(step.visited);
          } else if (step.visited && typeof step.visited === "object") {
            // keyed object -> treat keys as visited
            visitedSet = new Set(Object.keys(step.visited));
          } else if (step.visited === undefined) {
            // If the algorithm step doesn't include a visited snapshot, keep previous visited (so progress reflects cumulative work)
            visitedSet = new Set(prev.visited ? Array.from(prev.visited) : []);
          } else {
            visitedSet = new Set();
          }

          // Normalize queue to an array
          let queueArr = [];
          if (step.queue === undefined) {
            queueArr = Array.isArray(prev.queue) ? prev.queue : [];
          } else if (Array.isArray(step.queue)) {
            queueArr = step.queue.slice();
          } else {
            try {
              queueArr = Array.from(step.queue);
            } catch {
              queueArr = [];
            }
          }

          // Normalize path to an array (used for highlighting edges)
          let pathArr = [];
          if (step.path === undefined) {
            pathArr = Array.isArray(prev.path) ? prev.path : [];
          } else if (Array.isArray(step.path)) {
            pathArr = step.path.slice();
          } else {
            try {
              pathArr = Array.from(step.path);
            } catch {
              pathArr = [];
            }
          }

          // If a previous map is provided by the algorithm and no explicit path is present,
          // reconstruct a path from that previous mapping to the selected end node (or to current)
          if ((pathArr == null || pathArr.length === 0) && step.previous) {
            // prefer the explicitly selected endNode, then the step's current node, then attempt to derive a target
            let target = endNode || step.current || null;
            if (!target) {
              // fallback: pick the last key present in previous mapping
              const keys = Object.keys(step.previous || {});
              if (keys.length > 0) target = keys[keys.length - 1];
            }
            if (target) {
              const rebuilt = [];
              const seen = new Set();
              let cur = target;
              // Walk backwards using the previous mapping
              while (cur !== null && cur !== undefined && !seen.has(cur)) {
                rebuilt.unshift(cur);
                seen.add(cur);
                cur = step.previous[cur];
              }
              if (rebuilt.length > 0) {
                pathArr = rebuilt;
              }
            }
          }

          // Normalize distances to a plain object
          let distancesObj = {};
          if (step.distances === undefined) {
            distancesObj = prev.distances ? { ...prev.distances } : {};
          } else if (
            step.distances &&
            typeof step.distances === "object" &&
            !(step.distances instanceof Array)
          ) {
            distancesObj = { ...step.distances };
          } else {
            distancesObj = {};
          }

          // Normalize sccColors to a plain object (Map -> object)
          let sccColorsObj = {};
          if (step.sccColors === undefined) {
            sccColorsObj = prev.sccColors ? { ...prev.sccColors } : {};
          } else if (step.sccColors instanceof Map) {
            sccColorsObj = Object.fromEntries(step.sccColors);
          } else if (typeof step.sccColors === "object") {
            sccColorsObj = { ...step.sccColors };
          } else {
            sccColorsObj = {};
          }

          // Normalize previous mapping into a plain object so UI can reconstruct paths consistently
          let previousObj = {};
          if (step.previous === undefined) {
            previousObj = prev.previous ? { ...prev.previous } : {};
          } else if (step.previous instanceof Map) {
            previousObj = Object.fromEntries(step.previous);
          } else if (typeof step.previous === "object") {
            previousObj = { ...step.previous };
          } else {
            previousObj = {};
          }

          // Normalize order (topological sort) to an array; if present, also expose as result and mark visited
          let orderArr = undefined;
          if (step.order !== undefined) {
            orderArr = Array.isArray(step.order)
              ? step.order.slice()
              : Array.from(step.order || []);
          }

          if (orderArr && !step.result) {
            const labelOrder = orderArr.map((id) => {
              const n = nodes.find((nn) => nn.id === id);
              return (n && n.label) || id;
            });
            next.result = `Order: ${labelOrder.join(", ")}`;
            // mark visited as the order so progress bar reflects nodes processed
            visitedSet = new Set(orderArr);
          }

          // Apply all normalized pieces to next state
          next.visited = visitedSet;
          next.queue = queueArr;
          next.path = pathArr;
          next.distances = distancesObj;
          next.sccColors = sccColorsObj;
          // preserve the normalized previous mapping
          next.previous = previousObj;
          if (orderArr !== undefined) next.order = orderArr;

          // Merge simple scalar/other keys from step into next
          const scalarKeys = [
            "current",
            "phase",
            "finishOrderStack",
            "foundSccs",
            "showTransposed",
            "discoveryTimes",
            "finishTimes",
            "finished",
            "result",
          ];
          scalarKeys.forEach((k) => {
            if (step[k] !== undefined) next[k] = step[k];
          });

          // Ensure step counter is applied
          next.step = stepIndex + 1;

          return next;
        });

        stepIndex++;
      } else {
        setAlgorithmState((prev) => ({ ...prev, finished: true }));
        setIsPlaying(false);
        clearInterval(intervalRef.current);
      }
    }, animationSpeed);
  }, [
    startNode,
    endNode,
    nodes,
    edges,
    selectedAlgorithm,
    isDirected,
    getAlgorithmSteps,
    animationSpeed,
    resetAlgorithmState,
  ]);

  const togglePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      clearInterval(intervalRef.current);
    } else {
      playAlgorithm();
    }
  };

  const saveGraph = () => {
    alert("Save functionality is not implemented yet.");
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Canvas Area */}
          <div className="flex-1">
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 mb-4">
              <div className="p-4 border-b border-slate-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                      Graph Algorithm Visualizer
                    </h1>
                    <div className="flex items-center gap-3">
                      <Badge
                        className="font-semibold"
                        style={{
                          backgroundColor:
                            algorithms[selectedAlgorithm].color + "22",
                          color: algorithms[selectedAlgorithm].color,
                          borderColor:
                            algorithms[selectedAlgorithm].color + "40",
                        }}
                      >
                        {algorithms[selectedAlgorithm].name}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-slate-300 border-slate-600"
                      >
                        {isDirected ? "Directed" : "Undirected"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-slate-300 border-slate-600"
                      >
                        {nodes.length} nodes, {edges.length} edges
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveGraph}
                      disabled={nodes.length === 0}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Load
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex flex-wrap gap-3 mb-4">
                  <Button
                    onClick={togglePlayPause}
                    disabled={
                      (selectedAlgorithm !== "scc" && !startNode) ||
                      (selectedAlgorithm === "dijkstra" && !endNode) ||
                      nodes.length === 0
                    }
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {isPlaying ? "Pause" : "Run Algorithm"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetAlgorithmState}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>

                <GraphCanvas
                  nodes={nodes}
                  edges={edges}
                  setNodes={setNodes}
                  setEdges={setEdges}
                  isDirected={isDirected}
                  algorithmState={algorithmState}
                  selectedAlgorithm={selectedAlgorithm}
                  startNode={startNode}
                  endNode={endNode}
                  setStartNode={setStartNode}
                  setEndNode={setEndNode}
                  setAlgorithmState={setAlgorithmState}
                />
              </div>
            </Card>
          </div>

          {/* Control Panels */}
          <div className="w-full lg:w-80 space-y-4">
            <AlgorithmControls
              selectedAlgorithm={selectedAlgorithm}
              setSelectedAlgorithm={setSelectedAlgorithm}
              algorithms={algorithms}
              animationSpeed={animationSpeed}
              setAnimationSpeed={setAnimationSpeed}
              resetAlgorithmState={resetAlgorithmState}
            />

            {/* Supplemental Algorithm Info (keeps new algorithms' descriptions visible without editing AlgorithmControls) */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
              <div className="px-6 py-4">
                <div className="text-sm font-medium text-slate-300 mb-2">
                  Algorithm Overview
                </div>
                <div className="text-xs text-slate-400">
                  {algorithms[selectedAlgorithm]?.description ||
                    "Select an algorithm to see a short description."}
                </div>
              </div>
            </Card>

            <NodeEdgeManager
              isDirected={isDirected}
              setIsDirected={setIsDirected}
              nodes={nodes}
              setNodes={setNodes}
              setEdges={setEdges}
              resetAlgorithmState={resetAlgorithmState}
            />

            <ResultsPanel
              algorithmState={algorithmState}
              selectedAlgorithm={selectedAlgorithm}
              startNode={startNode}
              endNode={endNode}
              nodes={nodes}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
