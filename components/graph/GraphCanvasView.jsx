import React, { useRef, useEffect, useState, useCallback } from "react";
import GraphToolbar from "./GraphToolbar";

/**
 * GraphCanvasView
 *
 * A presentational and interactive canvas component dedicated to rendering the graph and
 * handling direct manipulations (add/select/connect/delete/pan/zoom/drag).
 *
 * This component adheres to SOLID by focusing solely on view and interaction responsibilities.
 * It accepts and uses injected utilities for canvas coordinate scaling, drawing primitives,
 * and state normalization, making it easy to test and replace utilities without changing this component.
 *
 * Props:
 * - nodes: Array<{ id: string, x: number, y: number, label?: string }>
 * - edges: Array<{ id: string, from: string, to: string, weight?: number }>
 * - setNodes: (fn | value) => void
 * - setEdges: (fn | value) => void
 * - isDirected: boolean
 * - algorithmState: object (read-only for rendering highlights/metadata)
 * - selectedAlgorithm: string
 * - startNode: string | null
 * - endNode: string | null
 * - setStartNode: (id | null) => void
 * - setEndNode: (id | null) => void
 * - setAlgorithmState: (fn | value) => void
 * - utils: {
 *     useScaledCoords?: (canvasRef, onResize) => { getScaledCoords(e): {x,y}, canvasDimensions: {width, height} },
 *     draw?: {
 *       DEFAULTS?: { nodeRadius: number, colors?: object, arrow?: object, curveOffset?: number },
 *       drawNodeCircle?: (ctx, node, options?) => void,
 *       drawNodeTimes?: (ctx, node, d, f, options?) => void,
 *       drawNodeDistance?: (ctx, node, distance, options?) => void,
 *       drawEdge?: (ctx, fromNode, toNode, options?) => void,
 *       shouldCurveEdge?: (isDirected, hasReverseEdge, fromNode, toNode) => boolean,
 *     },
 *     helpers?: {
 *       reconstructPathIfMissing?: (path, previous, { endNode, current }) => string[],
 *     }
 *   }
 */

/* -------- Fallback utilities (minimal, used only if not injected) -------- */

function useScaledCoordsFallback(canvasRef, onResize) {
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 800,
    height: 500,
  });
  const prevRef = useRef({ width: null, height: null });

  const getScaledCoords = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width || 1;
      const scaleY = canvas.height / rect.height || 1;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      return { x, y };
    },
    [canvasRef],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const prev = prevRef.current;
        canvas.width = width;
        canvas.height = height;
        setCanvasDimensions({ width, height });
        if (
          typeof onResize === "function" &&
          prev.width !== null &&
          (prev.width !== width || prev.height !== height)
        ) {
          try {
            onResize(prev, { width, height });
          } catch {
            // noop
          }
        }
        prevRef.current = { width, height };
      }
    });
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    setCanvasDimensions({ width: rect.width, height: rect.height });
    prevRef.current = { width: rect.width, height: rect.height };
    ro.observe(canvas);
    return () => {
      try {
        ro.unobserve(canvas);
        ro.disconnect();
      } catch {
        // noop
      }
    };
  }, [canvasRef, onResize]);

  return { getScaledCoords, canvasDimensions };
}

const fallbackDraw = {
  DEFAULTS: {
    nodeRadius: 25,
    colors: {
      nodeFill: "#6b7280",
      nodeBorder: "#1f2937",
      nodeLabel: "#ffffff",
      edge: "#475569",
      edgePath: "#3b82f6",
      arrow: "#475569",
    },
    arrow: { length: 15, angle: 0.5 },
    curveOffset: 40,
  },
  drawNodeCircle(ctx, node, { radius = 25, colors = {}, label } = {}) {
    const c = {
      nodeFill: "#6b7280",
      nodeBorder: "#1f2937",
      nodeLabel: "#ffffff",
      ...colors,
    };
    ctx.fillStyle = c.nodeFill;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.nodeBorder;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = c.nodeLabel;
    ctx.font = "bold 14px Inter";
    ctx.textAlign = "center";
    ctx.fillText(label ?? node.label ?? node.id, node.x, node.y + 5);
  },
  drawNodeTimes(ctx, node, d, f, { radius = 25 } = {}) {
    if (d === undefined && f === undefined) return;
    const timeText = `${d !== undefined ? d : ""}${f !== undefined ? ` / ${f}` : ""}`;
    ctx.font = "12px Inter";
    const textWidth = ctx.measureText(timeText).width;
    const rectPadding = 4;
    const rectWidth = textWidth + rectPadding * 2;
    const rectHeight = 16;
    ctx.fillStyle = "#111827";
    ctx.fillRect(
      node.x - rectWidth / 2,
      node.y - radius - rectHeight - 5,
      rectWidth,
      rectHeight,
    );
    ctx.fillStyle = "#cbd5e1";
    ctx.textAlign = "center";
    ctx.fillText(timeText, node.x, node.y - radius - 5 - rectHeight / 2 + 4);
  },
  drawNodeDistance(ctx, node, distance, { radius = 25 } = {}) {
    if (distance === undefined) return;
    ctx.fillStyle = distance !== Infinity ? "#fbbf24" : "#37415180";
    ctx.fillRect(node.x + radius - 5, node.y - radius - 15, 36, 20);
    ctx.fillStyle = "#1f2937";
    ctx.font = "12px Inter";
    ctx.textAlign = "center";
    ctx.fillText(
      distance === Infinity ? "∞" : String(distance),
      node.x + radius + 13,
      node.y - radius - 2,
    );
  },
  drawEdge(ctx, fromNode, toNode, options = {}) {
    const {
      color = "#475569",
      isDirected = false,
      nodeRadius = 25,
      curved = false,
      curveOffset = 40,
      lineWidth = 2,
      arrow = {},
      weight,
      showWeight = true,
    } = options;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    if (curved) {
      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const mx = (fromNode.x + toNode.x) / 2;
      const my = (fromNode.y + toNode.y) / 2;
      const norm = Math.hypot(dx, dy) || 1;
      const offsetX = (-curveOffset * dy) / norm;
      const offsetY = (curveOffset * dx) / norm;
      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.quadraticCurveTo(mx + offsetX, my + offsetY, toNode.x, toNode.y);
      ctx.stroke();
      if (isDirected) {
        const t = 0.95;
        const qx =
          (1 - t) * (1 - t) * fromNode.x +
          2 * (1 - t) * t * (mx + offsetX) +
          t * t * toNode.x;
        const qy =
          (1 - t) * (1 - t) * fromNode.y +
          2 * (1 - t) * t * (my + offsetY) +
          t * t * toNode.y;
        const dxdt =
          2 * (1 - t) * (mx + offsetX - fromNode.x) +
          2 * t * (toNode.x - (mx + offsetX));
        const dydt =
          2 * (1 - t) * (my + offsetY - fromNode.y) +
          2 * t * (toNode.y - (my + offsetY));
        const angle = Math.atan2(dydt, dxdt);
        const len = arrow.length ?? 15;
        const ad = arrow.angle ?? 0.5;
        ctx.beginPath();
        ctx.moveTo(qx, qy);
        ctx.lineTo(
          qx - len * Math.cos(angle - ad),
          qy - len * Math.sin(angle - ad),
        );
        ctx.moveTo(qx, qy);
        ctx.lineTo(
          qx - len * Math.cos(angle + ad),
          qy - len * Math.sin(angle + ad),
        );
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      ctx.stroke();
      if (isDirected) {
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        const x = toNode.x - Math.cos(angle) * nodeRadius;
        const y = toNode.y - Math.sin(angle) * nodeRadius;
        const len = arrow.length ?? 15;
        const ad = arrow.angle ?? 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
          x - len * Math.cos(angle - ad),
          y - len * Math.sin(angle - ad),
        );
        ctx.moveTo(x, y);
        ctx.lineTo(
          x - len * Math.cos(angle + ad),
          y - len * Math.sin(angle + ad),
        );
        ctx.stroke();
      }
    }

    if (showWeight && weight !== undefined && weight !== null && weight !== 1) {
      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + toNode.y) / 2;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(midX - 10, midY - 8, 20, 16);
      ctx.fillStyle = "#1f2937";
      ctx.font = "12px Inter";
      ctx.textAlign = "center";
      ctx.fillText(String(weight), midX, midY + 4);
    }
  },
  shouldCurveEdge(isDirected, hasReverseEdge, fromNode, toNode) {
    if (!isDirected || !hasReverseEdge) return false;
    return String(fromNode.id) < String(toNode.id);
  },
};

const fallbackHelpers = {
  reconstructPathIfMissing(path, previous, { endNode, current } = {}) {
    let pathArr;
    if (Array.isArray(path)) pathArr = path.slice();
    else if (path instanceof Set) pathArr = Array.from(path);
    else if (path && typeof path === "object") {
      const vals = Object.values(path);
      pathArr = vals.length > 0 ? vals : Object.keys(path);
    } else pathArr = [];

    if (pathArr.length > 0) return pathArr;

    const prev = previous || {};
    let target = endNode || current || null;
    if (!target) {
      const keys = Object.keys(prev);
      if (keys.length > 0) target = keys[keys.length - 1];
    }
    if (!target) return [];

    const rebuilt = [];
    const seen = new Set();
    let cur = target;
    while (cur !== null && cur !== undefined && !seen.has(cur)) {
      rebuilt.unshift(cur);
      seen.add(cur);
      cur = prev[cur];
    }
    return rebuilt;
  },
};

/* --------------------- Component Implementation --------------------- */

export default function GraphCanvasView({
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
  setAlgorithmState,
  mode,
  onChangeMode,
  utils = {},
}) {
  const canvasRef = useRef(null);

  // Injected utilities or fallbacks
  const useScaledCoords = utils.useScaledCoords || useScaledCoordsFallback;
  const draw = utils.draw || fallbackDraw;
  const helpers = utils.helpers || fallbackHelpers;

  // Interaction state
  // mode is controlled via props (prop-drilled from parent)
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectStart, setConnectStart] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Pan & Zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panLastRef = useRef(null);
  const panRef = useRef(pan);
  const scaleRef = useRef(scale);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  const animRef = useRef(null);
  const cancelAnimation = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);
  const animateTo = useCallback(
    (targetPan, targetScale, duration = 450) => {
      cancelAnimation();
      const start = performance.now();
      const startPan = { ...(panRef.current || pan) };
      const startScale = scaleRef.current || scale;
      const deltaPan = {
        x: targetPan.x - startPan.x,
        y: targetPan.y - startPan.y,
      };
      const deltaScale = targetScale - startScale;

      const step = (ts) => {
        const t = Math.min(1, (ts - start) / duration);
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const nextPan = {
          x: startPan.x + deltaPan.x * ease,
          y: startPan.y + deltaPan.y * ease,
        };
        const nextScale = startScale + deltaScale * ease;
        setPan(nextPan);
        setScale(nextScale);
        panRef.current = nextPan;
        scaleRef.current = nextScale;
        if (t < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          animRef.current = null;
        }
      };
      animRef.current = requestAnimationFrame(step);
    },
    [cancelAnimation, pan, scale],
  );

  // Keep world center stable on resize
  const handleCanvasResize = useCallback((oldDims, newDims) => {
    const currentPan = panRef.current || { x: 0, y: 0 };
    const currentScale = scaleRef.current || 1;
    const oldCenterX = (oldDims?.width ?? 0) / 2;
    const oldCenterY = (oldDims?.height ?? 0) / 2;
    const worldCenterX = (oldCenterX - currentPan.x) / currentScale;
    const worldCenterY = (oldCenterY - currentPan.y) / currentScale;
    const newCenterX = (newDims?.width ?? 0) / 2;
    const newCenterY = (newDims?.height ?? 0) / 2;
    const newPanX = newCenterX - worldCenterX * currentScale;
    const newPanY = newCenterY - worldCenterY * currentScale;
    setPan({ x: newPanX, y: newPanY });
  }, []);

  const { getScaledCoords, canvasDimensions } = useScaledCoords(
    canvasRef,
    handleCanvasResize,
  );

  // Fit to view: compute bounds and center nodes
  const computeFitView = useCallback(
    (nodesArg = nodes, padding = 80, animate = true) => {
      const canvas = canvasRef.current;
      if (!canvas || !nodesArg || nodesArg.length === 0) return;
      const width =
        (canvasDimensions && canvasDimensions.width) ||
        canvas.getBoundingClientRect().width;
      const height =
        (canvasDimensions && canvasDimensions.height) ||
        canvas.getBoundingClientRect().height;

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      nodesArg.forEach((n) => {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x);
        maxY = Math.max(maxY, n.y);
      });
      if (minX === Infinity) return;

      const nodesW = Math.max(1, maxX - minX);
      const nodesH = Math.max(1, maxY - minY);
      const effectivePadding = padding + 40;
      const availableW = Math.max(10, width - effectivePadding * 2);
      const availableH = Math.max(10, height - effectivePadding * 2);
      const scaleX = availableW / nodesW;
      const scaleY = availableH / nodesH;
      const targetScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 3);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const targetPanX = width / 2 - centerX * targetScale;
      const targetPanY = height / 2 - centerY * targetScale;

      if (animate) {
        cancelAnimation();
        animateTo({ x: targetPanX, y: targetPanY }, targetScale, 520);
      } else {
        setScale(targetScale);
        setPan({ x: targetPanX, y: targetPanY });
      }
    },
    [canvasRef, canvasDimensions, nodes, animateTo, cancelAnimation],
  );

  // Helpers
  const nodeRadius = draw?.DEFAULTS?.nodeRadius ?? 25;

  const getNodeColor = useCallback(
    (nodeId) => {
      if (
        selectedAlgorithm === "scc" &&
        algorithmState?.sccColors &&
        algorithmState.sccColors[nodeId]
      ) {
        return algorithmState.sccColors[nodeId];
      }

      const finishOrderRaw = algorithmState?.finishOrderStack;
      const finishOrder = Array.isArray(finishOrderRaw)
        ? finishOrderRaw
        : finishOrderRaw instanceof Set
          ? Array.from(finishOrderRaw)
          : finishOrderRaw && typeof finishOrderRaw === "object"
            ? Object.keys(finishOrderRaw)
            : [];

      if (
        selectedAlgorithm === "scc" &&
        algorithmState?.phase === "dfs1" &&
        finishOrder.includes(nodeId)
      ) {
        return "#f59e0b";
      }

      if (nodeId === startNode) return "#ef4444";
      if (nodeId === endNode) return "#f59e0b";
      if (algorithmState?.current === nodeId) return "#8b5cf6";

      let visited = algorithmState?.visited;
      if (!(visited instanceof Set)) {
        if (Array.isArray(visited)) visited = new Set(visited);
        else if (visited && typeof visited === "object")
          visited = new Set(Object.keys(visited));
        else visited = new Set();
      }

      if (visited.has(nodeId)) return "#10b981";
      return "#6b7280";
    },
    [algorithmState, startNode, endNode, selectedAlgorithm],
  );

  const getHighlightedPath = useCallback(() => {
    if (!algorithmState) return [];
    return helpers.reconstructPathIfMissing(
      algorithmState.path,
      algorithmState.previous,
      { endNode, current: algorithmState.current || null },
    );
  }, [algorithmState, helpers, endNode]);

  const isEdgeOnPath = useCallback(
    (edge, pathArr) => {
      if (!pathArr || pathArr.length < 2) return false;
      for (let i = 0; i < pathArr.length - 1; i++) {
        const a = pathArr[i],
          b = pathArr[i + 1];
        if (edge.from === a && edge.to === b) return true;
        if (!isDirected && edge.from === b && edge.to === a) return true;
      }
      return false;
    },
    [isDirected],
  );

  const getNodeAtPosition = (x, y) => {
    const worldX = (x - pan.x) / scale;
    const worldY = (y - pan.y) / scale;
    return nodes.find((node) => {
      const dx = node.x - worldX;
      const dy = node.y - worldY;
      return Math.hypot(dx, dy) <= nodeRadius;
    });
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Clear in device coordinates, then apply world transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
    ctx.setTransform(scale, 0, 0, scale, pan.x, pan.y);

    const pathArr = getHighlightedPath();

    // Draw edges (normal first, then path edges on top)
    const normalEdges = [];
    const pathEdges = [];
    edges.forEach((e) =>
      (isEdgeOnPath(e, pathArr) ? pathEdges : normalEdges).push(e),
    );

    const hasReverse = (edge) =>
      edges.some(
        (e) =>
          e.from === edge.to &&
          e.to === edge.from &&
          (isDirected || edge.from !== edge.to),
      );

    const colorNormal = draw?.DEFAULTS?.colors?.edge ?? "#475569";
    const colorPath = draw?.DEFAULTS?.colors?.edgePath ?? "#3b82f6";

    const drawEdgeGroup = (group, color) => {
      group.forEach((edge) => {
        let fromNode = nodes.find((n) => n.id === edge.from);
        let toNode = nodes.find((n) => n.id === edge.to);

        if (selectedAlgorithm === "scc" && algorithmState?.showTransposed) {
          [fromNode, toNode] = [toNode, fromNode];
        }
        if (!fromNode || !toNode) return;

        const curved = draw.shouldCurveEdge(
          isDirected,
          hasReverse(edge),
          fromNode,
          toNode,
        );
        draw.drawEdge(ctx, fromNode, toNode, {
          color,
          isDirected,
          nodeRadius,
          curved,
          curveOffset: draw?.DEFAULTS?.curveOffset ?? 40,
          lineWidth: 2,
          weight: edge.weight,
          showWeight: true,
          arrow: draw?.DEFAULTS?.arrow ?? { length: 15, angle: 0.5 },
        });
      });
    };

    drawEdgeGroup(normalEdges, colorNormal);
    drawEdgeGroup(pathEdges, colorPath);

    // Draw connecting guideline
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

    // Draw nodes and labels
    nodes.forEach((node) => {
      draw.drawNodeCircle(ctx, node, {
        radius: nodeRadius,
        colors: {
          nodeFill: getNodeColor(node.id),
          nodeBorder: "#1f2937",
          nodeLabel: "#ffffff",
        },
        label: node.label ?? node.id,
      });

      if (
        (selectedAlgorithm === "dfs" || selectedAlgorithm === "scc") &&
        algorithmState?.discoveryTimes
      ) {
        const d = algorithmState.discoveryTimes[node.id];
        const f = algorithmState.finishTimes?.[node.id];
        if (d !== undefined) {
          draw.drawNodeTimes(ctx, node, d, f, { radius: nodeRadius });
        }
      }

      if (
        (selectedAlgorithm === "dijkstra" ||
          selectedAlgorithm === "bellmanFord") &&
        algorithmState?.distances
      ) {
        const distance = algorithmState.distances[node.id];
        if (distance !== undefined) {
          draw.drawNodeDistance(ctx, node, distance, { radius: nodeRadius });
        }
      }
    });
  }, [
    canvasRef,
    canvasDimensions,
    scale,
    pan,
    nodes,
    edges,
    isDirected,
    getNodeColor,
    getHighlightedPath,
    isEdgeOnPath,
    isConnecting,
    connectStart,
    mousePos,
    selectedAlgorithm,
    algorithmState,
    draw,
    nodeRadius,
  ]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Mouse interactions
  const handleCanvasClick = (e) => {
    const { x, y } = getScaledCoords(e);
    const worldX = (x - pan.x) / scale;
    const worldY = (y - pan.y) / scale;
    const clickedNode = getNodeAtPosition(x, y);

    if (mode === "add" && !clickedNode) {
      const newNode = {
        id: `node_${Date.now()}`,
        x: worldX,
        y: worldY,
        label: String.fromCharCode(65 + nodes.length),
      };
      setNodes((prev) => [...prev, newNode]);
      return;
    }

    if (mode === "setstart" && clickedNode) {
      setStartNode(clickedNode.id);
      onChangeMode && onChangeMode("select");
      return;
    }

    if (mode === "setend" && clickedNode) {
      setEndNode(clickedNode.id);
      onChangeMode && onChangeMode("select");
      return;
    }

    if (mode === "delete" && clickedNode) {
      setNodes((prev) => prev.filter((n) => n.id !== clickedNode.id));
      setEdges((prev) =>
        prev.filter(
          (e) => e.from !== clickedNode.id && e.to !== clickedNode.id,
        ),
      );
      if (startNode === clickedNode.id) setStartNode(null);
      if (endNode === clickedNode.id) setEndNode(null);
      return;
    }

    // Select mode: update current highlight
    if (typeof setAlgorithmState === "function") {
      setAlgorithmState((prev) => ({
        ...prev,
        current: clickedNode ? clickedNode.id : null,
      }));
    }
  };

  const handleMouseDown = (e) => {
    const { x, y } = getScaledCoords(e);
    const clickedNode = getNodeAtPosition(x, y);
    if (mode === "connect" && clickedNode) {
      setIsConnecting(true);
      setConnectStart(clickedNode);
    } else if (clickedNode) {
      setIsDragging(true);
      setDragNode(clickedNode);
    } else {
      setIsPanning(true);
      panLastRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e) => {
    const { x, y } = getScaledCoords(e);
    setMousePos({ x, y });

    if (isPanning) {
      const last = panLastRef.current || { x: e.clientX, y: e.clientY };
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      panLastRef.current = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      return;
    }

    if (isDragging && dragNode) {
      const worldX = (x - pan.x) / scale;
      const worldY = (y - pan.y) / scale;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === dragNode.id ? { ...n, x: worldX, y: worldY } : n,
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
    if (isPanning) {
      setIsPanning(false);
      panLastRef.current = null;
    }
  };

  // Wheel zoom with cursor focus
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      cancelAnimation();

      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const delta = -e.deltaY;
      const zoomFactor = delta > 0 ? 1.1 : 0.9;

      const prevScale = scaleRef.current || scale;
      const prevPan = panRef.current || pan;
      const newScale = Math.min(3, Math.max(0.3, prevScale * zoomFactor));

      const worldX = (cx - prevPan.x) / prevScale;
      const worldY = (cy - prevPan.y) / prevScale;
      const newPanX = cx - worldX * newScale;
      const newPanY = cy - worldY * newScale;

      animateTo({ x: newPanX, y: newPanY }, newScale, 220);
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [animateTo, pan, scale, cancelAnimation]);

  return (
    <div className="w-full">
      <GraphToolbar
        mode={mode}
        onChangeMode={onChangeMode}
        onFit={() => computeFitView()}
      />

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          if (e.touches && e.touches.length === 1) {
            const t = e.touches[0];
            const x = t.clientX - rect.left;
            const y = t.clientY - rect.top;
            const worldX = (x - pan.x) / scale;
            const worldY = (y - pan.y) / scale;
            const touchedNode = nodes.find(
              (n) => Math.hypot(n.x - worldX, n.y - worldY) <= nodeRadius,
            );
            if (touchedNode) {
              setIsDragging(true);
              setDragNode(touchedNode);
            } else {
              setIsPanning(true);
              panLastRef.current = { x: t.clientX, y: t.clientY };
            }
          }
        }}
        onTouchMove={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          if (e.touches && e.touches.length === 1) {
            const t = e.touches[0];
            if (isDragging && dragNode) {
              const x = t.clientX - rect.left;
              const y = t.clientY - rect.top;
              const worldX = (x - pan.x) / scale;
              const worldY = (y - pan.y) / scale;
              setNodes((prev) =>
                prev.map((n) =>
                  n.id === dragNode.id ? { ...n, x: worldX, y: worldY } : n,
                ),
              );
            } else if (isPanning) {
              const last = panLastRef.current || { x: t.clientX, y: t.clientY };
              const dx = t.clientX - last.x;
              const dy = t.clientY - last.y;
              panLastRef.current = { x: t.clientX, y: t.clientY };
              setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
            }
          }
        }}
        onTouchEnd={() => {
          setIsPanning(false);
          panLastRef.current = null;
          setIsDragging(false);
          setDragNode(null);
        }}
        className="border border-slate-600 rounded-lg bg-slate-800 cursor-pointer w-full touch-none"
        style={{ width: "100%", height: "60vh", touchAction: "none" }}
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
    </div>
  );
}
