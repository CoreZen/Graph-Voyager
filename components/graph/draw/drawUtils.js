/**
 * Pure drawing utilities for Graph-Voyager canvas.
 * These helpers are framework-agnostic and contain no side effects beyond drawing to a provided CanvasRenderingContext2D.
 *
 * Exports:
 * - drawNodeCircle(ctx, node, options)
 * - drawNodeTimes(ctx, node, d, f, options)
 * - drawNodeDistance(ctx, node, distance, options)
 * - drawEdge(ctx, fromNode, toNode, options)
 * - drawArrowhead(ctx, x, y, angle, options)
 * - geometry helpers: quadraticPointAt, quadraticTangentAt
 */

/**
 * @typedef {{ id: string, x: number, y: number, label?: string }} Node
 */

/**
 * Defaults used across drawing helpers
 */
export const DEFAULTS = {
  nodeRadius: 25,
  colors: {
    nodeFill: "#6b7280", // gray
    nodeBorder: "#1f2937",
    nodeLabel: "#ffffff",
    timesBg: "#111827",
    timesText: "#cbd5e1",
    edge: "#475569", // slate
    edgePath: "#3b82f6", // blue
    arrow: "#475569",
    weightBg: "#ffffff",
    weightText: "#1f2937",
    distanceBox: "#fbbf24", // amber
    distanceBoxInfinity: "#37415180", // translucent muted
    distanceText: "#1f2937",
  },
  fonts: {
    nodeLabel: "bold 14px Inter",
    small: "12px Inter",
  },
  arrow: {
    length: 15,
    angle: 0.5,
  },
  curveOffset: 40,
};

/**
 * Draws a node as a filled circle with border and centered label
 * @param {CanvasRenderingContext2D} ctx
 * @param {Node} node
 * @param {{ radius?: number, colors?: { nodeFill?: string, nodeBorder?: string, nodeLabel?: string }, label?: string }} [options]
 */
export function drawNodeCircle(ctx, node, options = {}) {
  const radius = options.radius ?? DEFAULTS.nodeRadius;
  const colors = { ...DEFAULTS.colors, ...(options.colors || {}) };
  const label = options.label ?? node.label ?? node.id;

  ctx.fillStyle = colors.nodeFill;
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = colors.nodeBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (label) {
    ctx.fillStyle = colors.nodeLabel;
    ctx.font = DEFAULTS.fonts.nodeLabel;
    ctx.textAlign = "center";
    ctx.fillText(label, node.x, node.y + 5);
  }
}

/**
 * Draw discovery/finish time badge above the node
 * @param {CanvasRenderingContext2D} ctx
 * @param {Node} node
 * @param {number | undefined} d
 * @param {number | undefined} f
 * @param {{ radius?: number, colors?: { timesBg?: string, timesText?: string }, padding?: number }} [options]
 */
export function drawNodeTimes(ctx, node, d, f, options = {}) {
  if (d === undefined && f === undefined) return;
  const radius = options.radius ?? DEFAULTS.nodeRadius;
  const colors = { ...DEFAULTS.colors, ...(options.colors || {}) };
  const padding = options.padding ?? 4;

  const text = `${d !== undefined ? d : ""}${f !== undefined ? ` / ${f}` : ""}`;
  ctx.font = DEFAULTS.fonts.small;
  const textWidth = ctx.measureText(text).width;
  const rectWidth = textWidth + padding * 2;
  const rectHeight = 16;

  ctx.fillStyle = colors.timesBg;
  ctx.fillRect(
    node.x - rectWidth / 2,
    node.y - radius - rectHeight - 5,
    rectWidth,
    rectHeight,
  );

  ctx.fillStyle = colors.timesText;
  ctx.textAlign = "center";
  ctx.fillText(text, node.x, node.y - radius - 5 - rectHeight / 2 + 4);
}

/**
 * Draw a distance badge near the node (for shortest path algorithms)
 * @param {CanvasRenderingContext2D} ctx
 * @param {Node} node
 * @param {number | typeof Infinity | undefined} distance
 * @param {{ radius?: number, colors?: { distanceBox?: string, distanceBoxInfinity?: string, distanceText?: string } }} [options]
 */
export function drawNodeDistance(ctx, node, distance, options = {}) {
  if (distance === undefined) return;
  const radius = options.radius ?? DEFAULTS.nodeRadius;
  const colors = { ...DEFAULTS.colors, ...(options.colors || {}) };

  // background box
  ctx.fillStyle =
    distance !== Infinity ? colors.distanceBox : colors.distanceBoxInfinity;
  ctx.fillRect(node.x + radius - 5, node.y - radius - 15, 36, 20);

  // text
  ctx.fillStyle = colors.distanceText;
  ctx.font = DEFAULTS.fonts.small;
  ctx.textAlign = "center";
  ctx.fillText(
    distance === Infinity ? "∞" : String(distance),
    node.x + radius + 13,
    node.y - radius - 2,
  );
}

/**
 * Draw a simple weight label near the edge midpoint
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number|string} weight
 * @param {{ colors?: { weightBg?: string, weightText?: string } }} [options]
 */
export function drawWeightLabel(ctx, x, y, weight, options = {}) {
  const colors = { ...DEFAULTS.colors, ...(options.colors || {}) };
  ctx.fillStyle = colors.weightBg;
  ctx.fillRect(x - 10, y - 8, 20, 16);
  ctx.fillStyle = colors.weightText;
  ctx.font = DEFAULTS.fonts.small;
  ctx.textAlign = "center";
  ctx.fillText(String(weight), x, y + 4);
}

/**
 * Draw an arrowhead at the given position and angle
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} angle in radians
 * @param {{ color?: string, length?: number, angleDelta?: number }} [options]
 */
export function drawArrowhead(ctx, x, y, angle, options = {}) {
  const color = options.color ?? DEFAULTS.colors.arrow;
  const length = options.length ?? DEFAULTS.arrow.length;
  const angleDelta = options.angleDelta ?? DEFAULTS.arrow.angle;

  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x - length * Math.cos(angle - angleDelta),
    y - length * Math.sin(angle - angleDelta),
  );
  ctx.moveTo(x, y);
  ctx.lineTo(
    x - length * Math.cos(angle + angleDelta),
    y - length * Math.sin(angle + angleDelta),
  );
  ctx.stroke();
}

/**
 * Quadratic bezier helper: get point at parameter t (0..1)
 * @param {{x:number,y:number}} p0
 * @param {{x:number,y:number}} p1 control point
 * @param {{x:number,y:number}} p2
 * @param {number} t
 * @returns {{x:number,y:number}}
 */
export function quadraticPointAt(p0, p1, p2, t) {
  const mt = 1 - t;
  const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
  const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;
  return { x, y };
}

/**
 * Quadratic bezier helper: get tangent vector (dx,dy) at parameter t (0..1)
 * @param {{x:number,y:number}} p0
 * @param {{x:number,y:number}} p1
 * @param {{x:number,y:number}} p2
 * @param {number} t
 * @returns {{dx:number,dy:number}}
 */
export function quadraticTangentAt(p0, p1, p2, t) {
  const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  return { dx, dy };
}

/**
 * Draw a straight edge line between two nodes
 * @param {CanvasRenderingContext2D} ctx
 * @param {Node} fromNode
 * @param {Node} toNode
 * @param {{ color?: string, lineWidth?: number }} [options]
 */
export function drawStraightEdgeLine(ctx, fromNode, toNode, options = {}) {
  const color = options.color ?? DEFAULTS.colors.edge;
  const lineWidth = options.lineWidth ?? 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(fromNode.x, fromNode.y);
  ctx.lineTo(toNode.x, toNode.y);
  ctx.stroke();
}

/**
 * Draw a curved (quadratic) edge line between two nodes
 * @param {CanvasRenderingContext2D} ctx
 * @param {Node} fromNode
 * @param {Node} toNode
 * @param {{ color?: string, lineWidth?: number, curveOffset?: number }} [options]
 */
export function drawCurvedEdgeLine(ctx, fromNode, toNode, options = {}) {
  const color = options.color ?? DEFAULTS.colors.edge;
  const lineWidth = options.lineWidth ?? 2;
  const curveOffset = options.curveOffset ?? DEFAULTS.curveOffset;

  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  const mx = (fromNode.x + toNode.x) / 2;
  const my = (fromNode.y + toNode.y) / 2;
  const norm = Math.hypot(dx, dy) || 1;
  const offsetX = (-curveOffset * dy) / norm;
  const offsetY = (curveOffset * dx) / norm;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(fromNode.x, fromNode.y);
  ctx.quadraticCurveTo(mx + offsetX, my + offsetY, toNode.x, toNode.y);
  ctx.stroke();
}

/**
 * Draw a complete edge with optional arrowhead and weight.
 * Decides between straight and curved style (for bidirectional visualization) and places arrow accordingly.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Node} fromNode
 * @param {Node} toNode
 * @param {{
 *   color?: string,
 *   isDirected?: boolean,
 *   nodeRadius?: number,
 *   curved?: boolean,
 *   curveOffset?: number,
 *   lineWidth?: number,
 *   arrow?: { length?: number, angleDelta?: number, color?: string },
 *   weight?: number | string,
 *   showWeight?: boolean
 * }} [options]
 */
export function drawEdge(ctx, fromNode, toNode, options = {}) {
  const {
    color = DEFAULTS.colors.edge,
    isDirected = false,
    nodeRadius = DEFAULTS.nodeRadius,
    curved = false,
    curveOffset = DEFAULTS.curveOffset,
    lineWidth = 2,
    arrow = {},
    weight,
    showWeight = true,
  } = options;

  // Draw the edge path
  if (curved) {
    drawCurvedEdgeLine(ctx, fromNode, toNode, {
      color,
      lineWidth,
      curveOffset,
    });
  } else {
    drawStraightEdgeLine(ctx, fromNode, toNode, { color, lineWidth });
  }

  // Draw arrowhead for directed edges
  if (isDirected) {
    if (curved) {
      // Arrow near the end of the curve (t close to 1)
      const t = 0.95;
      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const mx = (fromNode.x + toNode.x) / 2;
      const my = (fromNode.y + toNode.y) / 2;
      const norm = Math.hypot(dx, dy) || 1;
      const offsetX = (-curveOffset * dy) / norm;
      const offsetY = (curveOffset * dx) / norm;

      const p0 = { x: fromNode.x, y: fromNode.y };
      const p1 = { x: mx + offsetX, y: my + offsetY };
      const p2 = { x: toNode.x, y: toNode.y };

      const { x, y } = quadraticPointAt(p0, p1, p2, t);
      const { dx: tx, dy: ty } = quadraticTangentAt(p0, p1, p2, t);
      const angle = Math.atan2(ty, tx);

      drawArrowhead(ctx, x, y, angle, {
        color: arrow.color ?? color,
        length: arrow.length ?? DEFAULTS.arrow.length,
        angleDelta: arrow.angleDelta ?? DEFAULTS.arrow.angle,
      });
    } else {
      // Arrow at the end of straight line, backed off by node radius
      const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
      const x = toNode.x - Math.cos(angle) * nodeRadius;
      const y = toNode.y - Math.sin(angle) * nodeRadius;
      drawArrowhead(ctx, x, y, angle, {
        color: arrow.color ?? color,
        length: arrow.length ?? DEFAULTS.arrow.length,
        angleDelta: arrow.angleDelta ?? DEFAULTS.arrow.angle,
      });
    }
  }

  // Weight label
  if (showWeight && weight !== undefined && weight !== null && weight !== 1) {
    const midX = (fromNode.x + toNode.x) / 2;
    const midY = (fromNode.y + toNode.y) / 2;
    drawWeightLabel(ctx, midX, midY, weight);
  }
}

/**
 * Utility: compute if an edge between A->B should be curved to reduce overlap in bidirectional cases.
 * Recommended usage: pass true when the reverse edge exists and you are drawing one of the two directions.
 * @param {boolean} isDirected
 * @param {boolean} hasReverseEdge
 * @param {Node} fromNode
 * @param {Node} toNode
 * @returns {boolean}
 */
export function shouldCurveEdge(isDirected, hasReverseEdge, fromNode, toNode) {
  if (!isDirected) return false;
  if (!hasReverseEdge) return false;
  // Use a deterministic tiebreaker so only one of the pair curves in a consistent way
  return String(fromNode.id) < String(toNode.id);
}

/**
 * Utility: distance between two points
 * @param {{x:number,y:number}} a
 * @param {{x:number,y:number}} b
 * @returns {number}
 */
export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Hit test helper for nodes (in world space)
 * @param {Node} node
 * @param {{x:number,y:number}} point
 * @param {number} [radius]
 * @returns {boolean}
 */
export function isPointInNode(node, point, radius = DEFAULTS.nodeRadius) {
  return distance({ x: node.x, y: node.y }, point) <= radius;
}
