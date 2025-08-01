import React, { useState, useCallback, useRef, useEffect } from "react";
import { Card } from "../components/ui/card";
import Button from "../components/ui/button";
import Badge from "../components/ui/badge";
import { Play, Pause, RotateCcw, Save, Upload, Settings } from "lucide-react";

import GraphCanvas from "../components/graph/GraphCanvas";
import AlgorithmControls from "../components/graph/AlgorithmControls";
import NodeEdgeManager from "../components/graph/NodeEdgeManager";
import ResultsPanel from "../components/graph/ResultsPanel";

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
  });
  const [animationSpeed, setAnimationSpeed] = useState(500);
  const [startNode, setStartNode] = useState(null);
  const [endNode, setEndNode] = useState(null);
  const intervalRef = useRef(null);

  const algorithms = {
    bfs: { name: "Breadth-First Search", color: "#3b82f6" },
    dfs: { name: "Depth-First Search", color: "#10b981" },
    dijkstra: { name: "Dijkstra's Algorithm", color: "#f59e0b" },
    scc: { name: "Strongly Connected Components", color: "#8b5cf6" },
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
    });
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const buildPath = useCallback((previous, targetNodeId) => {
    const path = [];
    let current = targetNodeId;
    while (current !== null && previous[current] !== undefined) {
      path.unshift(current);
      current = previous[current];
    }
    return path;
  }, []);

  const runBFS = useCallback(
    (nodes, edges, startNodeId, endNodeId) => {
      const adjList = {};
      nodes.forEach((node) => (adjList[node.id] = []));
      edges.forEach((edge) => {
        adjList[edge.from].push(edge.to);
        if (!isDirected) adjList[edge.to].push(edge.from);
      });

      const queue = [startNodeId];
      const visited = new Set([startNodeId]);
      const previous = { [startNodeId]: null };
      const steps = [];
      let found = false;

      // Initial state before processing
      steps.push({
        visited: new Set(visited),
        current: startNodeId,
        queue: [...queue],
        path: buildPath(previous, startNodeId),
      });

      while (queue.length > 0) {
        const current = queue.shift();

        if (current === endNodeId) {
          found = true;
          // Push the final state before breaking
          steps.push({
            visited: new Set(visited),
            current: current,
            queue: [...queue], // Queue might still have elements
            path: buildPath(previous, current),
          });
          break;
        }

        const neighbors = adjList[current] || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            previous[neighbor] = current;
            queue.push(neighbor);
            steps.push({
              visited: new Set(visited),
              current: neighbor, // The newly discovered node is highlighted
              queue: [...queue],
              path: buildPath(previous, neighbor), // Path to the newly discovered node
            });
          }
        }
      }

      // Add one final step to highlight the complete path if endNode was found, or just mark as finished.
      if (found && endNodeId) {
        steps.push({
          ...steps[steps.length - 1],
          finished: true,
          path: buildPath(previous, endNodeId),
        });
      } else if (steps.length > 0) {
        // If endNode was not specified or not found, just mark the end of traversal
        steps.push({ ...steps[steps.length - 1], finished: true });
      } else {
        // Handle case of empty graph or no start node
        steps.push({ finished: true });
      }

      return steps;
    },
    [isDirected, buildPath],
  );

  const runDFS = useCallback(
    (nodes, edges, startNodeId, endNodeId) => {
      const adjList = {};
      nodes.forEach((node) => (adjList[node.id] = []));
      edges.forEach((edge) => {
        adjList[edge.from].push(edge.to);
        if (!isDirected) adjList[edge.to].push(edge.from);
      });

      const steps = [];
      const visited = new Set();
      const previous = { [startNodeId]: null }; // Initialize previous map
      let time = 0;
      const discoveryTimes = {};
      const finishTimes = {};
      let found = false; // Flag to stop DFS early if endNode is found

      const dfsVisit = (u) => {
        if (found) return; // Stop exploring if end node is found

        time++;
        discoveryTimes[u] = time;
        visited.add(u);

        steps.push({
          visited: new Set(visited),
          current: u,
          path: buildPath(previous, u), // Path to current node
          discoveryTimes: { ...discoveryTimes },
          finishTimes: { ...finishTimes },
        });

        if (u === endNodeId) {
          found = true;
          // Add final step with finish time (and mark as finished)
          time++;
          finishTimes[u] = time;
          steps.push({
            ...steps[steps.length - 1],
            finished: true,
            finishTimes: { ...finishTimes },
          });
          return;
        }

        const neighbors = adjList[u] || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            previous[neighbor] = u; // Record parent
            dfsVisit(neighbor);
            if (found) return; // Propagate the stop signal
          }
        }

        time++;
        finishTimes[u] = time;
        // Add a new step to show the state after finishing this node
        // This step will reflect the final finish time for 'u'
        steps.push({
          visited: new Set(visited),
          current: u,
          path: buildPath(previous, u),
          discoveryTimes: { ...discoveryTimes },
          finishTimes: { ...finishTimes },
        });
      };

      // Start DFS from the given start node
      const initialStartNodeExists = nodes.some((n) => n.id === startNodeId);
      if (initialStartNodeExists && !visited.has(startNodeId)) {
        dfsVisit(startNodeId);
      }

      // If endNode was not found, or not specified, add a final finished step.
      if (!found) {
        if (steps.length > 0) {
          steps.push({ ...steps[steps.length - 1], finished: true });
        } else {
          steps.push({ finished: true }); // Case: no valid start node or empty graph
        }
      }

      return steps;
    },
    [isDirected, buildPath],
  );

  const runDijkstra = useCallback(
    (nodes, edges, startNodeId, endNodeId) => {
      const adjList = {};
      nodes.forEach((node) => (adjList[node.id] = []));
      edges.forEach((edge) => {
        adjList[edge.from].push({ node: edge.to, weight: edge.weight });
        if (!isDirected)
          adjList[edge.to].push({ node: edge.from, weight: edge.weight });
      });

      const distances = {};
      const previous = {};
      const visited = new Set();
      const steps = [];

      nodes.forEach((node) => {
        distances[node.id] = node.id === startNodeId ? 0 : Infinity;
        previous[node.id] = null;
      });

      while (visited.size < nodes.length) {
        let current = null;
        let minDistance = Infinity;

        for (const nodeId in distances) {
          if (!visited.has(nodeId) && distances[nodeId] < minDistance) {
            minDistance = distances[nodeId];
            current = nodeId;
          }
        }

        if (current === null || distances[current] === Infinity) break;

        visited.add(current);
        steps.push({
          visited: new Set(visited),
          current,
          distances: { ...distances },
          path: buildPath(previous, endNodeId || current), // Use the common buildPath
        });

        if (current === endNodeId) break;

        const neighbors = adjList[current] || [];
        for (const { node: neighbor, weight } of neighbors) {
          if (!visited.has(neighbor)) {
            const newDistance = distances[current] + weight;
            if (newDistance < distances[neighbor]) {
              distances[neighbor] = newDistance;
              previous[neighbor] = current;
            }
          }
        }
      }
      return steps;
    },
    [isDirected, buildPath],
  );

  const runSCC = useCallback(
    (nodes, edges) => {
      const adj = {};
      const adjT = {}; // Transposed graph
      nodes.forEach((node) => {
        adj[node.id] = [];
        adjT[node.id] = [];
      });
      edges.forEach((edge) => {
        adj[edge.from].push(edge.to);
        adjT[edge.to].push(edge.from); // Transpose the edge direction
      });

      const steps = [];
      let visited = new Set();
      const finishOrderStack = []; // Stack to store nodes by finish time in DFS1
      let time = 0; // Global time for discovery/finish times
      const discoveryTimes1 = {};
      const finishTimes1 = {};

      // Helper for 1st DFS
      const dfs1 = (u) => {
        time++;
        discoveryTimes1[u] = time;
        visited.add(u);
        steps.push({
          phase: "dfs1",
          visited: new Set(visited),
          current: u,
          finishOrderStack: [...finishOrderStack], // Snapshot of stack before this node finishes
          foundSccs: [],
          sccColors: {},
          showTransposed: false,
          discoveryTimes: { ...discoveryTimes1 },
          finishTimes: { ...finishTimes1 },
        });
        (adj[u] || []).forEach((v) => {
          if (!visited.has(v)) dfs1(v);
        });
        time++;
        finishTimes1[u] = time;
        finishOrderStack.push(u); // Push node to stack AFTER it finishes
        steps.push({
          phase: "dfs1",
          visited: new Set(visited),
          current: u,
          finishOrderStack: [...finishOrderStack], // Snapshot of stack after this node finishes
          foundSccs: [],
          sccColors: {},
          showTransposed: false,
          discoveryTimes: { ...discoveryTimes1 },
          finishTimes: { ...finishTimes1 },
        });
      };

      // 1. First DFS pass (on original graph)
      nodes.forEach((node) => {
        if (!visited.has(node.id)) dfs1(node.id);
      });

      // Colors for SCCs
      const colors = [
        "#f87171",
        "#fb923c",
        "#a3e635",
        "#4ade80",
        "#34d399",
        "#22d3ee",
        "#818cf8",
        "#a78bfa",
        "#f472b6",
        "#fb7185",
        "#e879f9",
        "#60a5fa",
        "#d946ef",
      ];

      // Transpose phase step
      steps.push({
        phase: "transpose",
        showTransposed: true,
        finishOrderStack: [...finishOrderStack],
        visited: new Set(),
        current: null,
        foundSccs: [],
        sccColors: {},
        discoveryTimes: {}, // Times are reset for the next phase's DFS
        finishTimes: {},
      });

      // Helper for 2nd DFS
      visited = new Set(); // Reset visited for the second DFS
      const foundSccs = [];
      const sccColors = {};
      let sccColorIndex = 0;
      time = 0; // Reset time for second pass
      const discoveryTimes2 = {};
      const finishTimes2 = {};

      // Use a separate mutable array for visualization of the stack shrinking in DFS2
      const currentFinishOrderStackForViz = [...finishOrderStack];

      const dfs2 = (u, currentScc) => {
        time++;
        discoveryTimes2[u] = time;
        visited.add(u);
        currentScc.push(u);
        sccColors[u] = colors[sccColorIndex % colors.length];
        steps.push({
          phase: "dfs2",
          visited: new Set(visited),
          current: u,
          foundSccs: [...foundSccs, currentScc],
          sccColors: { ...sccColors },
          showTransposed: true,
          finishOrderStack: [...currentFinishOrderStackForViz], // Pass the dynamically shrinking stack
          discoveryTimes: { ...discoveryTimes2 },
          finishTimes: { ...finishTimes2 },
        });
        (adjT[u] || []).forEach((v) => {
          if (!visited.has(v)) dfs2(v, currentScc);
        });
        time++;
        finishTimes2[u] = time;
        // The outline specified this for updating previous state, making a new step that's mostly identical but with updated finishTimes.
        steps.push({
          ...steps[steps.length - 1],
          finishTimes: { ...finishTimes2 },
        });
      };

      // 2. Second DFS pass (on transposed graph)
      // Iterate nodes in decreasing order of finish times from first DFS
      while (currentFinishOrderStackForViz.length > 0) {
        const u = currentFinishOrderStackForViz.pop(); // Pop from the top (latest finish time)

        if (!visited.has(u)) {
          // If node not yet visited, it's the root of a new SCC
          const currentScc = [];
          foundSccs.push(currentScc); // Add a new empty SCC to the list
          dfs2(u, currentScc); // Start DFS on this new SCC
          sccColorIndex++;
        }
      }

      // Final step for result display
      steps.push({
        phase: "finished",
        visited: new Set(visited),
        current: null,
        foundSccs: [...foundSccs],
        sccColors: { ...sccColors },
        showTransposed: false,
        finishOrderStack: [], // Stack is now empty
        finished: true,
        result: `Found ${foundSccs.length} SCCs.`,
        discoveryTimes: { ...discoveryTimes2 }, // Final discovery times
        finishTimes: { ...finishTimes2 }, // Final finish times
      });

      return steps;
    },
    [isDirected],
  );

  const playAlgorithm = useCallback(() => {
    if ((!startNode && selectedAlgorithm !== "scc") || nodes.length === 0)
      return;

    resetAlgorithmState();
    let steps = [];

    try {
      switch (selectedAlgorithm) {
        case "bfs":
          steps = runBFS(nodes, edges, startNode, endNode);
          break;
        case "dfs":
          steps = runDFS(nodes, edges, startNode, endNode);
          break;
        case "dijkstra":
          if (!endNode) {
            alert("Please select an end node for Dijkstra's Algorithm.");
            return;
          }
          steps = runDijkstra(nodes, edges, startNode, endNode);
          break;
        case "scc":
          if (!isDirected) {
            alert(
              "Strongly Connected Components algorithm is designed for directed graphs. Please enable 'Directed Graph' mode.",
            );
            return;
          }
          steps = runSCC(nodes, edges);
          break;
        default:
          return;
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
        setAlgorithmState((prev) => ({
          ...prev,
          ...steps[stepIndex],
          step: stepIndex + 1,
        }));
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
    runBFS,
    runDFS,
    runDijkstra,
    runSCC,
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
                        className={`bg-${algorithms[selectedAlgorithm].color}/20 text-${algorithms[selectedAlgorithm].color} border-${algorithms[selectedAlgorithm].color}/30`}
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
