import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Button from "../ui/button";
import { Switch } from "../ui/switch";
import { Trash2, RotateCcw, Shuffle } from "lucide-react";

export default function NodeEdgeManager({
  isDirected,
  setIsDirected,
  nodes,
  setNodes,
  setEdges,
  resetAlgorithmState,
}) {
  const clearGraph = () => {
    setNodes([]);
    setEdges([]);
    resetAlgorithmState();
  };

  const generateRandomGraph = () => {
    const nodeCount = 6 + Math.floor(Math.random() * 4); // 6-10 nodes
    const newNodes = [];
    const newEdges = [];

    // Create nodes
    for (let i = 0; i < nodeCount; i++) {
      newNodes.push({
        id: `node_${i}`,
        x: 100 + Math.random() * 600,
        y: 100 + Math.random() * 300,
        label: String.fromCharCode(65 + i),
      });
    }

    // Create random edges
    const edgeCount = Math.floor(nodeCount * 1.5);
    for (let i = 0; i < edgeCount; i++) {
      const from = newNodes[Math.floor(Math.random() * nodeCount)];
      const to = newNodes[Math.floor(Math.random() * nodeCount)];

      if (from.id !== to.id) {
        const edgeExists = newEdges.some(
          (edge) =>
            (edge.from === from.id && edge.to === to.id) ||
            (!isDirected && edge.from === to.id && edge.to === from.id),
        );

        if (!edgeExists) {
          newEdges.push({
            id: `edge_${i}`,
            from: from.id,
            to: to.id,
            weight: Math.floor(Math.random() * 9) + 1,
          });
        }
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
    resetAlgorithmState();
  };

  const createSampleGraphs = {
    tree: () => {
      const treeNodes = [
        { id: "A", x: 400, y: 50, label: "A" },
        { id: "B", x: 300, y: 150, label: "B" },
        { id: "C", x: 500, y: 150, label: "C" },
        { id: "D", x: 250, y: 250, label: "D" },
        { id: "E", x: 350, y: 250, label: "E" },
        { id: "F", x: 450, y: 250, label: "F" },
        { id: "G", x: 550, y: 250, label: "G" },
      ];
      const treeEdges = [
        { id: "e1", from: "A", to: "B", weight: 1 },
        { id: "e2", from: "A", to: "C", weight: 1 },
        { id: "e3", from: "B", to: "D", weight: 1 },
        { id: "e4", from: "B", to: "E", weight: 1 },
        { id: "e5", from: "C", to: "F", weight: 1 },
        { id: "e6", from: "C", to: "G", weight: 1 },
      ];
      setNodes(treeNodes);
      setEdges(treeEdges);
      resetAlgorithmState();
    },
    weighted: () => {
      const weightedNodes = [
        { id: "S", x: 100, y: 200, label: "S" },
        { id: "A", x: 300, y: 100, label: "A" },
        { id: "B", x: 300, y: 300, label: "B" },
        { id: "C", x: 500, y: 100, label: "C" },
        { id: "D", x: 500, y: 300, label: "D" },
        { id: "E", x: 700, y: 200, label: "E" },
      ];
      const weightedEdges = [
        { id: "e1", from: "S", to: "A", weight: 4 },
        { id: "e2", from: "S", to: "B", weight: 2 },
        { id: "e3", from: "A", to: "C", weight: 3 },
        { id: "e4", from: "B", to: "D", weight: 4 },
        { id: "e5", from: "C", to: "E", weight: 2 },
        { id: "e6", from: "D", to: "E", weight: 3 },
        { id: "e7", from: "A", to: "B", weight: 1 },
        { id: "e8", from: "C", to: "D", weight: 5 },
      ];
      setNodes(weightedNodes);
      setEdges(weightedEdges);
      resetAlgorithmState();
    },
    scc: () => {
      const sccNodes = [
        { id: "A", x: 100, y: 100, label: "A" },
        { id: "B", x: 250, y: 50, label: "B" },
        { id: "C", x: 400, y: 100, label: "C" },
        { id: "D", x: 400, y: 250, label: "D" },
        { id: "E", x: 100, y: 250, label: "E" },
        { id: "F", x: 250, y: 350, label: "F" },
        { id: "G", x: 400, y: 400, label: "G" },
        { id: "H", x: 550, y: 175, label: "H" },
      ];
      const sccEdges = [
        { id: "e1", from: "A", to: "B", weight: 1 },
        { id: "e2", from: "B", to: "C", weight: 1 },
        { id: "e3", from: "C", to: "A", weight: 1 },
        { id: "e4", from: "B", to: "D", weight: 1 },
        { id: "e5", from: "D", to: "E", weight: 1 },
        { id: "e6", from: "E", to: "D", weight: 1 },
        { id: "e7", from: "F", to: "E", weight: 1 },
        { id: "e8", from: "G", to: "F", weight: 1 },
        { id: "e9", from: "H", to: "G", weight: 1 },
        { id: "e10", from: "D", to: "H", weight: 1 },
      ];
      setNodes(sccNodes);
      setEdges(sccEdges);
      setIsDirected(true); // SCC requires a directed graph
      resetAlgorithmState();
    },
  };

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-200">Graph Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">
            Directed Graph
          </label>
          <Switch
            checked={isDirected}
            onCheckedChange={(checked) => {
              setIsDirected(checked);
              resetAlgorithmState();
            }}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Quick Actions
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateRandomGraph}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Shuffle className="w-4 h-4 mr-1" />
              Random
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearGraph}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Sample Graphs
          </label>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={createSampleGraphs.tree}
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Binary Tree
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={createSampleGraphs.weighted}
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Weighted Graph
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={createSampleGraphs.scc}
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              SCC Example (Directed)
            </Button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-700">
          <div className="text-xs text-slate-400 space-y-1">
            <p>
              <strong>Select:</strong> Click for start, Shift+click for end
            </p>
            <p>
              <strong>Add:</strong> Click empty space
            </p>
            <p>
              <strong>Connect:</strong> Click and drag between nodes
            </p>
            <p>
              <strong>Delete:</strong> Click on nodes
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
