import React, { useRef, useEffect, useState, useCallback } from "react";
import { Card } from "../ui/card";

// Custom hook for scaling coordinates and handling resize
const useScaledCoords = (canvasRef) => {
  // Use local state for canvas dimensions, will be updated by ResizeObserver
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 800,
    height: 500,
  });

  const getScaledCoords = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      // Use the actual canvas element's width/height attributes for scaling
      // These attributes are set by the ResizeObserver to match the displayed size
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      return { x, y };
    },
    [canvasRef],
  ); // canvasRef is sufficient as canvas.width/height are directly accessed

  useEffect(() => {
    const canvas = canvasRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (canvas) {
          // Set the canvas element's internal resolution to match its display size
          canvas.width = width;
          canvas.height = height;
        }
        setCanvasDimensions({ width, height }); // Update state, though not strictly needed for getScaledCoords after setting canvas.width/height
      }
    });

    if (canvas) {
      // Set initial canvas dimensions to match current client rect
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      setCanvasDimensions({ width: rect.width, height: rect.height });
      resizeObserver.observe(canvas);
    }

    return () => {
      if (canvas) resizeObserver.unobserve(canvas);
    };
  }, [canvasRef]);

  return { getScaledCoords, canvasDimensions };
};

export default function GraphCanvas({
  nodes,
  edges,
  setNodes,
  setEdges,
  isDirected,
  algorithmState,
  selectedAlgorithm,
  startNode,
  endNode,
  setStartNode,
  setEndNode,
}) {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectStart, setConnectStart] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState("select"); // 'select', 'add', 'connect', 'delete'

  const { getScaledCoords, canvasDimensions } = useScaledCoords(canvasRef);

  const nodeRadius = 25;

  const getNodeColor = useCallback(
    (nodeId) => {
      if (
        selectedAlgorithm === "scc" &&
        algorithmState.sccColors &&
        algorithmState.sccColors[nodeId]
      ) {
        return algorithmState.sccColors[nodeId];
      }
      if (
        selectedAlgorithm === "scc" &&
        algorithmState.phase === "dfs1" &&
        algorithmState.finishOrderStack.includes(nodeId)
      ) {
        return "#f59e0b"; // amber for finished nodes in pass 1
      }
      if (nodeId === startNode) return "#ef4444"; // red for start
      if (nodeId === endNode) return "#f59e0b"; // amber for end
      if (algorithmState.current === nodeId) return "#8b5cf6"; // purple for current
      if (algorithmState.visited.has(nodeId)) return "#10b981"; // emerald for visited
      return "#6b7280"; // gray for unvisited
    },
    [algorithmState, startNode, endNode, selectedAlgorithm],
  );

  const getEdgeColor = useCallback(
    (edge) => {
      if (algorithmState.path && algorithmState.path.length > 1) {
        for (let i = 0; i < algorithmState.path.length - 1; i++) {
          if (
            (algorithmState.path[i] === edge.from &&
              algorithmState.path[i + 1] === edge.to) ||
            (!isDirected &&
              algorithmState.path[i] === edge.to &&
              algorithmState.path[i + 1] === edge.from)
          ) {
            return "#3b82f6"; // blue for path
          }
        }
      }
      return "#475569"; // slate for normal
    },
    [algorithmState.path, isDirected],
  );

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);

    // Split edges into path edges and normal edges
    const pathEdges = [];
    const normalEdges = [];
    edges.forEach((edge) => {
      const isPathEdge = (() => {
        if (algorithmState.path && algorithmState.path.length > 1) {
          for (let i = 0; i < algorithmState.path.length - 1; i++) {
            if (
              (algorithmState.path[i] === edge.from &&
                algorithmState.path[i + 1] === edge.to) ||
              (!isDirected &&
                algorithmState.path[i] === edge.to &&
                algorithmState.path[i + 1] === edge.from)
            ) {
              return true;
            }
          }
        }
        return false;
      })();
      if (isPathEdge) {
        pathEdges.push(edge);
      } else {
        normalEdges.push(edge);
      }
    });

    // Helper to check if an edge is bidirectional
    function isBidirectional(edge) {
      return edges.some(
        (e) =>
          e.from === edge.to &&
          e.to === edge.from &&
          (isDirected || edge.from !== edge.to),
      );
    }

    // Draw normal edges first, then path edges
    [normalEdges, pathEdges].forEach((edgeGroup) => {
      edgeGroup.forEach((edge) => {
        let fromNode = nodes.find((n) => n.id === edge.from);
        let toNode = nodes.find((n) => n.id === edge.to);

        // If visualizing SCC and showing transposed graph, swap source and destination for drawing
        if (selectedAlgorithm === "scc" && algorithmState.showTransposed) {
          [fromNode, toNode] = [toNode, fromNode];
        }

        if (fromNode && toNode) {
          // Set stroke color for edge
          ctx.strokeStyle = getEdgeColor(edge);
          ctx.lineWidth = 2;

          // Draw curved edge for bidirectional links (only for directed graphs)
          const bidirectional =
            isDirected && isBidirectional(edge) && edge.from < edge.to;
          if (bidirectional) {
            // Draw a quadratic curve
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            const mx = (fromNode.x + toNode.x) / 2;
            const my = (fromNode.y + toNode.y) / 2;
            // Perpendicular offset for curve
            const curveOffset = 40;
            const norm = Math.sqrt(dx * dx + dy * dy) || 1;
            const offsetX = -curveOffset * (dy / norm);
            const offsetY = curveOffset * (dx / norm);

            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.quadraticCurveTo(
              mx + offsetX,
              my + offsetY,
              toNode.x,
              toNode.y,
            );
            ctx.stroke();
          } else {
            // Draw straight edge
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.stroke();
          }

          // Draw arrow for directed graphs
          if (isDirected) {
            let angle, arrowX, arrowY;
            if (bidirectional) {
              // For curved edge, compute tangent at end
              const t = 0.95; // near the end
              const mx = (fromNode.x + toNode.x) / 2;
              const my = (fromNode.y + toNode.y) / 2;
              const dx = toNode.x - fromNode.x;
              const dy = toNode.y - fromNode.y;
              const curveOffset = 40;
              const norm = Math.sqrt(dx * dx + dy * dy) || 1;
              const offsetX = -curveOffset * (dy / norm);
              const offsetY = curveOffset * (dx / norm);

              // Quadratic Bezier formula and derivative for tangent
              const x =
                (1 - t) * (1 - t) * fromNode.x +
                2 * (1 - t) * t * (mx + offsetX) +
                t * t * toNode.x;
              const y =
                (1 - t) * (1 - t) * fromNode.y +
                2 * (1 - t) * t * (my + offsetY) +
                t * t * toNode.y;
              // Derivative for angle
              const dxdt =
                2 * (1 - t) * (mx + offsetX - fromNode.x) +
                2 * t * (toNode.x - (mx + offsetX));
              const dydt =
                2 * (1 - t) * (my + offsetY - fromNode.y) +
                2 * t * (toNode.y - (my + offsetY));
              angle = Math.atan2(dydt, dxdt);
              arrowX = x;
              arrowY = y;
            } else {
              angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
              arrowX = toNode.x - Math.cos(angle) * nodeRadius;
              arrowY = toNode.y - Math.sin(angle) * nodeRadius;
            }

            const arrowLength = 15;
            const arrowAngle = 0.5;

            // Set stroke color for arrowhead (again, just before drawing)
            ctx.strokeStyle = getEdgeColor(edge);

            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(
              arrowX - arrowLength * Math.cos(angle - arrowAngle),
              arrowY - arrowLength * Math.sin(angle - arrowAngle),
            );
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(
              arrowX - arrowLength * Math.cos(angle + arrowAngle),
              arrowY - arrowLength * Math.sin(angle + arrowAngle),
            );
            ctx.stroke();
          }

          // Draw weight
          if (edge.weight && edge.weight !== 1) {
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(midX - 10, midY - 8, 20, 16);
            ctx.fillStyle = "#1f2937";
            ctx.font = "12px Inter";
            ctx.textAlign = "center";
            ctx.fillText(edge.weight.toString(), midX, midY + 4);
          }
        }
      });
    });

    // Draw connecting line when creating edge
    if (isConnecting && connectStart) {
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(connectStart.x, connectStart.y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw nodes
    nodes.forEach((node) => {
      ctx.fillStyle = getNodeColor(node.id);
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
      ctx.fill();

      // Node border
      ctx.strokeStyle = "#1f2937";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node label
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px Inter";
      ctx.textAlign = "center";
      ctx.fillText(node.label, node.x, node.y + 5);

      // Draw discovery/finish times for DFS and SCC
      if (
        (selectedAlgorithm === "dfs" || selectedAlgorithm === "scc") &&
        algorithmState.discoveryTimes
      ) {
        const d = algorithmState.discoveryTimes[node.id];
        const f = algorithmState.finishTimes[node.id];
        if (d !== undefined) {
          // Check for undefined to allow 0
          const timeText = `${d}${f !== undefined ? ` / ${f}` : ""}`;
          ctx.font = "12px Inter"; // Set font before measuring text
          const textWidth = ctx.measureText(timeText).width;
          const rectPadding = 4;
          const rectWidth = textWidth + rectPadding * 2;
          const rectHeight = 16;

          // Draw background rectangle for the time text
          ctx.fillStyle = "#111827"; // Dark background for text
          ctx.fillRect(
            node.x - rectWidth / 2,
            node.y - nodeRadius - rectHeight - 5,
            rectWidth,
            rectHeight,
          );

          ctx.fillStyle = "#cbd5e1"; // slate-300
          ctx.textAlign = "center";
          ctx.fillText(
            timeText,
            node.x,
            node.y - nodeRadius - 5 - rectHeight / 2 + 4,
          );
        }
      }
    });

    // Draw distances for Dijkstra
    if (selectedAlgorithm === "dijkstra" && algorithmState.distances) {
      nodes.forEach((node) => {
        const distance = algorithmState.distances[node.id];
        if (distance !== undefined && distance !== Infinity) {
          ctx.fillStyle = "#fbbf24";
          ctx.fillRect(
            node.x + nodeRadius - 5,
            node.y - nodeRadius - 15,
            30,
            20,
          );
          ctx.fillStyle = "#1f2937";
          ctx.font = "12px Inter";
          ctx.textAlign = "center";
          ctx.fillText(
            distance.toString(),
            node.x + nodeRadius + 10,
            node.y - nodeRadius - 2,
          );
        }
      });
    }
  }, [
    nodes,
    edges,
    isDirected,
    getNodeColor,
    getEdgeColor,
    isConnecting,
    connectStart,
    mousePos,
    selectedAlgorithm,
    algorithmState,
    canvasDimensions,
  ]);

  const getNodeAtPosition = (x, y) => {
    return nodes.find((node) => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= nodeRadius;
    });
  };

  const handleCanvasClick = (e) => {
    const { x, y } = getScaledCoords(e);

    const clickedNode = getNodeAtPosition(x, y);

    if (mode === "add" && !clickedNode) {
      // Add new node
      const newNode = {
        id: `node_${Date.now()}`,
        x,
        y,
        label: String.fromCharCode(65 + nodes.length), // A, B, C, etc.
      };
      setNodes((prev) => [...prev, newNode]);
    } else if (mode === "select" && clickedNode) {
      // Select start/end nodes
      if (e.shiftKey) {
        setEndNode(clickedNode.id);
      } else {
        setStartNode(clickedNode.id);
      }
    } else if (mode === "delete" && clickedNode) {
      // Delete node and its edges
      setNodes((prev) => prev.filter((n) => n.id !== clickedNode.id));
      setEdges((prev) =>
        prev.filter(
          (e) => e.from !== clickedNode.id && e.to !== clickedNode.id,
        ),
      );
      if (startNode === clickedNode.id) setStartNode(null);
      if (endNode === clickedNode.id) setEndNode(null);
    }
  };

  const handleMouseDown = (e) => {
    const { x, y } = getScaledCoords(e);
    const clickedNode = getNodeAtPosition(x, y);

    if (mode === "connect" && clickedNode) {
      setIsConnecting(true);
      setConnectStart(clickedNode);
    } else if (mode === "select" && clickedNode) {
      setIsDragging(true);
      setDragNode(clickedNode);
    }
  };

  const handleMouseMove = (e) => {
    const { x, y } = getScaledCoords(e);
    setMousePos({ x, y });

    if (isDragging && dragNode) {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === dragNode.id ? { ...node, x, y } : node,
        ),
      );
    }
  };

  const handleMouseUp = (e) => {
    if (isConnecting && connectStart) {
      const { x, y } = getScaledCoords(e);
      const targetNode = getNodeAtPosition(x, y);

      if (targetNode && targetNode.id !== connectStart.id) {
        const edgeExists = edges.some(
          (edge) =>
            (edge.from === connectStart.id && edge.to === targetNode.id) ||
            (!isDirected &&
              edge.from === targetNode.id &&
              edge.to === connectStart.id),
        );

        if (!edgeExists) {
          const newEdge = {
            id: `edge_${Date.now()}`,
            from: connectStart.id,
            to: targetNode.id,
            weight: 1,
          };
          setEdges((prev) => [...prev, newEdge]);
        }
      }
    }

    setIsDragging(false);
    setDragNode(null);
    setIsConnecting(false);
    setConnectStart(null);
  };

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <Card className="bg-slate-900/50 border-slate-700 p-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setMode("select")}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            mode === "select"
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          Select (Click: Start, Shift+Click: End)
        </button>
        <button
          onClick={() => setMode("add")}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            mode === "add"
              ? "bg-green-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          Add Nodes
        </button>
        <button
          onClick={() => setMode("connect")}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            mode === "connect"
              ? "bg-purple-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          Connect Edges
        </button>
        <button
          onClick={() => setMode("delete")}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            mode === "delete"
              ? "bg-red-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          Delete
        </button>
      </div>

      <canvas
        ref={canvasRef}
        // Initial width/height can be set here or left to ResizeObserver to establish on mount
        // Setting them here will give a default rendering size before ResizeObserver kicks in
        // However, the ResizeObserver will override these with the actual computed size.
        // For dynamic sizing based on parent, it's better to let ResizeObserver manage it.
        // For consistent initial render, you might keep them: width={800} height={500}
        // But the prompt implies they should be removed, so remove them.
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="border border-slate-600 rounded-lg bg-slate-800 cursor-pointer w-full"
        style={{ maxWidth: "100%", height: "auto" }}
      />

      <div className="mt-2 text-xs text-slate-400">
        Current mode:{" "}
        <span className="text-slate-200 font-medium capitalize">{mode}</span>
        {startNode && (
          <span className="ml-4">
            Start:{" "}
            <span className="text-red-400">
              {nodes.find((n) => n.id === startNode)?.label}
            </span>
          </span>
        )}
        {endNode && (
          <span className="ml-4">
            End:{" "}
            <span className="text-amber-400">
              {nodes.find((n) => n.id === endNode)?.label}
            </span>
          </span>
        )}
      </div>
    </Card>
  );
}
