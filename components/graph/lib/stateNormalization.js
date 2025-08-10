/**
 * Helpers to normalize algorithm step/state shapes for rendering.
 * These utilities centralize type normalization and minor reconstruction logic
 * (like rebuilding a path from a `previous` map) so components can stay lean.
 *
 * All functions are framework-agnostic and side-effect free.
 */

/**
 * Normalize a "visited" value into a Set.
 * - Accepts Set, Array, or keyed Object (keys => visited)
 * - Falls back to previous visited if incoming is undefined
 * @param {any} visited
 * @param {Set<string>|undefined} prevVisited
 * @returns {Set<string>}
 */
export function normalizeVisited(visited, prevVisited) {
  if (visited instanceof Set) return new Set(visited);
  if (Array.isArray(visited)) return new Set(visited);
  if (visited && typeof visited === "object") {
    // treat keys as visited (matches UI expectations)
    return new Set(Object.keys(visited));
  }
  // keep previous if present; otherwise empty
  return new Set(prevVisited ? Array.from(prevVisited) : []);
}

/**
 * Normalize a queue-like value to an Array.
 * - Accepts Array, Set, or other iterable; if undefined, fallback to prev
 * @param {any} queue
 * @param {Array<string>|undefined} prevQueue
 * @returns {Array<string>}
 */
export function normalizeQueue(queue, prevQueue) {
  if (queue === undefined) return Array.isArray(prevQueue) ? prevQueue.slice() : [];
  if (Array.isArray(queue)) return queue.slice();
  try {
    return Array.from(queue || []);
  } catch {
    return [];
  }
}

/**
 * Normalize distances to a plain object; falls back to prev if undefined.
 * @param {any} distances
 * @param {Record<string, number>|undefined} prevDistances
 * @returns {Record<string, number>}
 */
export function normalizeDistances(distances, prevDistances) {
  if (distances && typeof distances === "object" && !Array.isArray(distances)) {
    return { ...distances };
  }
  return prevDistances ? { ...prevDistances } : {};
}

/**
 * Normalize a Map-like (Map or Object) to a plain Object; falls back to prev if undefined.
 * @param {any} mapLike
 * @param {Record<string, any>|undefined} prev
 * @returns {Record<string, any>}
 */
export function normalizeMapLikeObject(mapLike, prev) {
  if (mapLike instanceof Map) return Object.fromEntries(mapLike);
  if (mapLike && typeof mapLike === "object" && !Array.isArray(mapLike)) {
    return { ...mapLike };
  }
  return prev ? { ...prev } : {};
}

/**
 * Normalize SCC color mapping to a plain object; falls back to prev if undefined.
 * @param {any} sccColors
 * @param {Record<string, string>|undefined} prev
 * @returns {Record<string, string>}
 */
export function normalizeSccColors(sccColors, prev) {
  return normalizeMapLikeObject(sccColors, prev);
}

/**
 * Normalize "previous" mapping (predecessor map) to a plain object; falls back to prev if undefined.
 * @param {any} previous
 * @param {Record<string, string|null>|undefined} prev
 * @returns {Record<string, string|null>}
 */
export function normalizePrevious(previous, prev) {
  return normalizeMapLikeObject(previous, prev);
}

/**
 * Turn an unknown sequence-like into an Array.
 * - Arrays return a shallow copy
 * - Sets become Array.from
 * - Plain objects return Object.values(obj) when non-empty, else Object.keys(obj)
 * - Otherwise returns []
 * @param {any} value
 * @returns {Array<any>}
 */
export function toArrayFromUnknown(value) {
  if (Array.isArray(value)) return value.slice();
  if (value instanceof Set) return Array.from(value);
  if (value && typeof value === "object") {
    const vals = Object.values(value);
    return vals.length > 0 ? vals : Object.keys(value);
  }
  try {
    return Array.from(value || []);
  } catch {
    return [];
  }
}

/**
 * Normalize a "path" collection to an Array of node ids; falls back to prev if undefined.
 * @param {any} path
 * @param {Array<string>|undefined} prevPath
 * @returns {Array<string>}
 */
export function normalizePath(path, prevPath) {
  if (path === undefined) return Array.isArray(prevPath) ? prevPath.slice() : [];
  return toArrayFromUnknown(path);
}

/**
 * Build a path by walking back from target using a predecessor mapping.
 * Guards against cycles by tracking seen nodes.
 * @param {Record<string, string|null|undefined>} previous
 * @param {string|null|undefined} target
 * @returns {Array<string>}
 */
export function buildPathFromPrevious(previous, target) {
  if (!previous || target == null) return [];
  const path = [];
  const seen = new Set();
  let cur = target;
  while (cur !== null && cur !== undefined && !seen.has(cur)) {
    path.unshift(cur);
    seen.add(cur);
    cur = previous[cur];
  }
  return path;
}

/**
 * Choose a reasonable target for path reconstruction when explicit target is not given:
 * - prefer endNode if provided
 * - else current node if provided
 * - else use the last enumerable key in the previous map (often most recently discovered)
 * @param {Record<string, any>} previous
 * @param {string|null|undefined} endNode
 * @param {string|null|undefined} current
 * @returns {string|null}
 */
export function choosePathTarget(previous, endNode, current) {
  if (endNode) return endNode;
  if (current) return current;
  if (previous && typeof previous === "object") {
    const keys = Object.keys(previous);
    if (keys.length > 0) return keys[keys.length - 1];
  }
  return null;
}

/**
 * Reconstruct a path when missing or empty using a `previous` map and a target hint.
 * If an explicit path is provided and length > 0, it is returned as-is.
 * @param {any} path
 * @param {Record<string, string|null|undefined>|undefined} previous
 * @param {{ endNode?: string|null, current?: string|null }} [hints]
 * @returns {Array<string>}
 */
export function reconstructPathIfMissing(path, previous, hints = {}) {
  const pathArr = toArrayFromUnknown(path);
  if (pathArr && pathArr.length > 0) return pathArr;

  const target = choosePathTarget(previous || {}, hints.endNode, hints.current);
  if (!target) return [];

  const rebuilt = buildPathFromPrevious(previous || {}, target);
  return rebuilt.length > 0 ? rebuilt : [];
}

/**
 * Normalize topological order to an Array<string>.
 * @param {any} order
 * @returns {Array<string>}
 */
export function normalizeOrder(order) {
  return toArrayFromUnknown(order);
}

/**
 * Compute topological order violations for a directed graph.
 * A violation is any directed edge u->v where position(u) >= position(v) in the order.
 * Returns an array of:
 * { edgeId: string, from: string, to: string, fromIndex: number, toIndex: number }
 *
 * @param {Array<string>} order
 * @param {Array<{id?: string, from: string, to: string}>} edges
 * @param {boolean} isDirected
 * @returns {Array<{edgeId: string, from: string, to: string, fromIndex: number, toIndex: number}>}
 */
export function computeTopologicalViolations(order, edges, isDirected) {
  if (!Array.isArray(order) || order.length === 0) return [];
  const pos = {};
  order.forEach((id, idx) => {
    pos[id] = idx;
  });

  const violations = [];
  (edges || []).forEach((e) => {
    if (!isDirected) return; // Only meaningful for directed graphs
    const fromPos = pos[e.from];
    const toPos = pos[e.to];
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
  return violations;
}

/**
 * High-level helper to normalize an algorithm step relative to previous UI state.
 * This follows the same semantics used in the current UI to keep behavior consistent.
 *
 * @param {{
 *  step?: any,
 *  visited?: any,
 *  queue?: any,
 *  path?: any,
 *  distances?: any,
 *  sccColors?: any,
 *  previous?: any,
 *  order?: any,
 *  current?: string|null,
 *  phase?: string|null,
 *  finishOrderStack?: any,
 *  foundSccs?: any,
 *  showTransposed?: boolean,
 *  discoveryTimes?: any,
 *  finishTimes?: any,
 *  finished?: boolean,
 *  result?: string|null
 * }} step
 * @param {{
 *  visited?: Set<string>,
 *  queue?: Array<string>,
 *  path?: Array<string>,
 *  distances?: Record<string, number>,
 *  sccColors?: Record<string, string>,
 *  previous?: Record<string, string|null>,
 *  order?: Array<string>,
 *  [key:string]: any
 * }} prevState
 * @param {{ endNode?: string|null }} [context]
 * @returns {{
 *  visited: Set<string>,
 *  queue: Array<string>,
 *  path: Array<string>,
 *  distances: Record<string, number>,
 *  sccColors: Record<string, string>,
 *  previous: Record<string, string|null>,
 *  order?: Array<string>,
 *  current?: string|null,
 *  phase?: string|null,
 *  finishOrderStack?: any,
 *  foundSccs?: any,
 *  showTransposed?: boolean,
 *  discoveryTimes?: any,
 *  finishTimes?: any,
 *  finished?: boolean,
 *  result?: string|null
 * }}
 */
export function normalizeStepAgainstPrev(step, prevState, context = {}) {
  const endNode = context.endNode ?? null;

  const visited = normalizeVisited(step.visited, prevState.visited);
  const queue = normalizeQueue(step.queue, prevState.queue);
  const distances = normalizeDistances(step.distances, prevState.distances);
  const sccColors = normalizeSccColors(step.sccColors, prevState.sccColors);
  const previous = normalizePrevious(step.previous, prevState.previous);

  // Prefer explicit path; otherwise reconstruct from previous mapping
  let path = normalizePath(step.path, prevState.path);
  if (!path || path.length === 0) {
    path = reconstructPathIfMissing(path, previous, {
      endNode,
      current: step.current ?? prevState.current ?? null,
    });
  }

  const next = {
    ...prevState,
    visited,
    queue,
    path,
    distances,
    sccColors,
    previous,
  };

  // Normalize order (topological sort)
  if (step.order !== undefined) {
    next.order = normalizeOrder(step.order);
  }

  // Copy scalar/other keys directly when provided
  const passthroughKeys = [
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
  passthroughKeys.forEach((k) => {
    if (step[k] !== undefined) next[k] = step[k];
  });

  return next;
}
