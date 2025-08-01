import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Slider } from "../ui/slider";
import Badge from "../ui/badge";
import { Zap } from "lucide-react";

export default function AlgorithmControls({
  selectedAlgorithm,
  setSelectedAlgorithm,
  algorithms,
  animationSpeed,
  setAnimationSpeed,
  resetAlgorithmState,
}) {
  const handleAlgorithmChange = (value) => {
    console.log("Algorithm selected:", value);
    setSelectedAlgorithm(value);
    resetAlgorithmState();
  };

  const handleSpeedChange = (value) => {
    setAnimationSpeed(1100 - value[0]); // Invert so slider left = slower
  };

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-200 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Algorithm Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-300 mb-2 block">
            Select Algorithm
          </label>
          <Select
            value={selectedAlgorithm}
            onValueChange={handleAlgorithmChange}
          >
            {Object.entries(algorithms).map(([key, algo]) => (
              <SelectItem key={key} value={key} className="text-slate-200">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: algo.color }}
                  />
                  {algo.name}
                </div>
              </SelectItem>
            ))}
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-300 mb-2 block">
            Animation Speed
          </label>
          <div className="space-y-2">
            <Slider
              value={[1100 - animationSpeed]}
              onValueChange={handleSpeedChange}
              max={1000}
              min={100}
              step={50}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="text-sm font-medium text-slate-300 mb-2">
            Algorithm Info
          </div>
          <div className="space-y-2">
            {selectedAlgorithm === "bfs" && (
              <div className="text-xs text-slate-400 space-y-1">
                <p>• Explores nodes level by level</p>
                <p>• Finds shortest unweighted path</p>
                <p>• Time: O(V + E), Space: O(V)</p>
              </div>
            )}
            {selectedAlgorithm === "dfs" && (
              <div className="text-xs text-slate-400 space-y-1">
                <p>• Explores as far as possible first</p>
                <p>• Good for connectivity, cycles</p>
                <p>• Time: O(V + E), Space: O(V)</p>
              </div>
            )}
            {selectedAlgorithm === "dijkstra" && (
              <div className="text-xs text-slate-400 space-y-1">
                <p>• Finds shortest weighted path</p>
                <p>• Requires non-negative weights</p>
                <p>• Time: O(V²), Space: O(V)</p>
              </div>
            )}
            {selectedAlgorithm === "scc" && (
              <div className="text-xs text-slate-400 space-y-1">
                <p>• Finds strongly connected components</p>
                <p>• Uses Kosaraju's algorithm</p>
                <p>• Time: O(V + E), Space: O(V)</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
