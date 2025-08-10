/**
 * Centralized algorithm library for Graph-Voyager
 *
 * Exports:
 *  - runBFS(nodes, edges, options)
 *  - runDFS(nodes, edges, options)
 *  - runDijkstra(nodes, edges, options)
 *  - runSCC(nodes, edges, options)        // Kosaraju's algorithm (visualization-friendly)
 *  - runBellmanFord(nodes, edges, options)
 *  - runTopologicalSort(nodes, edges, options)
 *
 * Each algorithm returns an array of "steps". A step is a plain object describing
 * the state at a point in time suitable for visualization. The shape intentionally
 * mirrors the state keys used by the UI so integrating into the visualizer is straightforward.
 *
 * Common step keys (may vary by algorithm):
 *  - visited: Set | null
 *  - current: nodeId | null
 *  - queue: array of nodeIds (BFS)
 *  - path: array of nodeIds (reconstructed path for shortest-path algorithms)
 *  - distances: { nodeId: distance } (Dijkstra / Bellman-Ford)
 *  - discoveryTimes / finishTimes: { nodeId: time } (DFS / SCC)
 *  - finishOrderStack: array (SCC)
 *  - phase: string (SCC phases)
 *  - foundSccs: array of arrays (SCC)
 *  - sccColors: { nodeId: color } (SCC)
 *  - showTransposed: boolean (SCC visualization)
 *  - finished: boolean
 *  - result: string
 *
 * Options:
 *  - isDirected: boolean (default: false)
 *  - startNode: nodeId (for traversals/shortest-paths)
 *  - endNode: nodeId (optional target for shortest-paths)
 *
 * This file is intended to be framework-agnostic and pure (no side-effects).
 */

const DEFAULT_COLORS = [
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

function buildAdjacency(nodes, edges, isDirected = false, weighted = false) {
  const adj = {};
  nodes.forEach((n) => {
    adj[n.id] = [];
  });
  edges.forEach((e) => {
    if (!adj[e.from]) adj[e.from] = [];
    if (!adj[e.to]) adj[e.to] = [];
    if (weighted) {
      adj[e.from].push({ node: e.to, weight: e.weight ?? 1 });
      if (!isDirected) adj[e.to].push({ node: e.from, weight: e.weight ?? 1 });
    } else {
      adj[e.from].push(e.to);
      if (!isDirected) adj[e.to].push(e.from);
    }
  });
  return adj;
}

function buildPath(previous, targetNodeId) {
  const path = [];
  if (!targetNodeId) return path;
  let cur = targetNodeId;
  // If previous[cur] is undefined but cur exists as starting node with null
  // we still handle it gracefully. Loop until cur is null or undefined.
  while (cur !== null && cur !== undefined) {
    path.unshift(cur);
    cur = previous[cur];
  }
  return path;
}

/**
 * BFS
 * - Returns array of steps for visualization.
 */
export function runBFS(nodes, edges, options = {}) {
  const { isDirected = false, startNode, endNode } = options;
  const adj = buildAdjacency(nodes, edges, isDirected, false);
  const steps = [];

  if (!startNode || !nodes.some((n) => n.id === startNode)) {
    // No valid start - push finished empty step
    steps.push({ finished: true });
    return steps;
  }

  const queue = [startNode];
  const visited = new Set([startNode]);
  const previous = {};
  previous[startNode] = null;

  // initial state
  steps.push({
    visited: new Set(visited),
    current: startNode,
    queue: [...queue],
    path: buildPath(previous, startNode),
    previous: { ...previous },
  });

  let found = false;
  while (queue.length) {
    const u = queue.shift();

    if (u === endNode) {
      found = true;
      steps.push({
        visited: new Set(visited),
        current: u,
        queue: [...queue],
        path: buildPath(previous, u),
        previous: { ...previous },
      });
      break;
    }

    const neighbors = adj[u] || [];
    for (const v of neighbors) {
      if (!visited.has(v)) {
        visited.add(v);
        previous[v] = u;
        queue.push(v);
        steps.push({
          visited: new Set(visited),
          current: v,
          queue: [...queue],
          path: buildPath(previous, v),
          previous: { ...previous },
        });
      }
    }
  }

  if (found && endNode) {
    steps.push({
      ...steps[steps.length - 1],
      finished: true,
      path: buildPath(previous, endNode),
      previous: { ...previous },
    });
  } else if (steps.length > 0) {
    // If endNode was not specified or not found, just mark the end of traversal
    steps.push({
      ...steps[steps.length - 1],
      finished: true,
      previous: { ...previous },
    });
  } else {
    // Handle case of empty graph or no start node
    steps.push({ finished: true });
  }

  return steps;
}

/**
 * DFS (recursive, visualization-friendly)
 */
export function runDFS(nodes, edges, options = {}) {
  const { isDirected = false, startNode, endNode } = options;
  const adj = buildAdjacency(nodes, edges, isDirected, false);
  const steps = [];

  if (!startNode || !nodes.some((n) => n.id === startNode)) {
    steps.push({ finished: true });
    return steps;
  }

  const visited = new Set();
  const previous = {};
  previous[startNode] = null;
  let time = 0;
  const discoveryTimes = {};
  const finishTimes = {};
  let found = false;

  const dfsVisit = (u) => {
    if (found) return;
    time++;
    discoveryTimes[u] = time;
    visited.add(u);
    steps.push({
      visited: new Set(visited),
      current: u,
      path: buildPath(previous, u),
      discoveryTimes: { ...discoveryTimes },
      finishTimes: { ...finishTimes },
      previous: { ...previous },
    });

    if (u === endNode) {
      found = true;
      time++;
      finishTimes[u] = time;
      steps.push({
        ...steps[steps.length - 1],
        finished: true,
        finishTimes: { ...finishTimes },
        previous: { ...previous },
      });
      return;
    }

    const neighbors = adj[u] || [];
    for (const v of neighbors) {
      if (!visited.has(v)) {
        previous[v] = u;
        dfsVisit(v);
        if (found) return;
      }
    }

    time++;
    finishTimes[u] = time;
    steps.push({
      visited: new Set(visited),
      current: u,
      path: buildPath(previous, u),
      discoveryTimes: { ...discoveryTimes },
      finishTimes: { ...finishTimes },
      previous: { ...previous },
    });
  };

  dfsVisit(startNode);

  if (!found) {
    if (steps.length > 0) {
      steps.push({
        ...steps[steps.length - 1],
        finished: true,
        previous: { ...previous },
      });
    } else {
      steps.push({ finished: true }); // Case: no valid start node or empty graph
    }
  }

  return steps;
}

/**
 * Dijkstra's algorithm (simple O(V^2) implementation)
 */
export function runDijkstra(nodes, edges, options = {}) {
  const { isDirected = false, startNode, endNode } = options;
  const adj = buildAdjacency(nodes, edges, isDirected, true);
  const steps = [];

  if (!startNode || !nodes.some((n) => n.id === startNode)) {
    steps.push({ finished: true });
    return steps;
  }

  const distances = {};
  const previous = {};
  const visited = new Set();

  nodes.forEach((n) => {
    distances[n.id] = n.id === startNode ? 0 : Infinity;
    previous[n.id] = null;
  });

  while (visited.size < nodes.length) {
    let current = null;
    let minDist = Infinity;
    for (const id in distances) {
      if (!visited.has(id) && distances[id] < minDist) {
        minDist = distances[id];
        current = id;
      }
    }

    if (current === null || distances[current] === Infinity) break;

    visited.add(current);
    steps.push({
      visited: new Set(visited),
      current,
      distances: { ...distances },
      path: buildPath(previous, endNode || current), // Use the common buildPath
      previous: { ...previous },
    });

    if (current === endNode) break;

    const neighbors = adj[current] || [];
    for (const { node: v, weight } of neighbors) {
      if (!visited.has(v)) {
        const nd = distances[current] + (weight ?? 1);
        if (nd < distances[v]) {
          distances[v] = nd;
          previous[v] = current;
          steps.push({
            visited: new Set(visited),
            current: v,
            distances: { ...distances },
            path: buildPath(previous, endNode || v),
          });
        }
      }
    }
  }

  steps.push({
    ...steps[steps.length - 1],
    finished: true,
    result: endNode
      ? `Distance to ${endNode}: ${
          distances[endNode] === Infinity ? "∞" : distances[endNode]
        }`
      : "Finished",
    previous: { ...previous },
  });

  return steps;
}

/**
 * SCC - Kosaraju's algorithm (produces visualization steps)
 */
export function runSCC(nodes, edges, options = {}) {
  const isDirected = true; // SCC is meaningful for directed graphs; callers should ensure this
  const adj = buildAdjacency(nodes, edges, isDirected, false);
  // Transposed adjacency
  const adjT = {};
  nodes.forEach((n) => (adjT[n.id] = []));
  edges.forEach((e) => {
    if (!adjT[e.to]) adjT[e.to] = [];
    adjT[e.to].push(e.from);
  });

  const steps = [];
  let visited = new Set();
  const finishOrderStack = [];
  let time = 0;
  const discoveryTimes1 = {};
  const finishTimes1 = {};

  const dfs1 = (u) => {
    time++;
    discoveryTimes1[u] = time;
    visited.add(u);
    steps.push({
      phase: "dfs1",
      visited: new Set(visited),
      current: u,
      finishOrderStack: [...finishOrderStack],
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
    finishOrderStack.push(u);
    steps.push({
      phase: "dfs1",
      visited: new Set(visited),
      current: u,
      finishOrderStack: [...finishOrderStack],
      foundSccs: [],
      sccColors: {},
      showTransposed: false,
      discoveryTimes: { ...discoveryTimes1 },
      finishTimes: { ...finishTimes1 },
    });
  };

  // First pass
  nodes.forEach((n) => {
    if (!visited.has(n.id)) dfs1(n.id);
  });

  // Transpose step
  steps.push({
    phase: "transpose",
    showTransposed: true,
    finishOrderStack: [...finishOrderStack],
    visited: new Set(),
    current: null,
    foundSccs: [],
    sccColors: {},
    discoveryTimes: {},
    finishTimes: {},
  });

  // Second pass on transposed graph
  visited = new Set();
  const foundSccs = [];
  const sccColors = {};
  let sccIndex = 0;
  time = 0;
  const discoveryTimes2 = {};
  const finishTimes2 = {};

  // Copy of stack for visualization (we will pop)
  const vizStack = [...finishOrderStack];

  const dfs2 = (u, bucket) => {
    time++;
    discoveryTimes2[u] = time;
    visited.add(u);
    bucket.push(u);
    sccColors[u] = DEFAULT_COLORS[sccIndex % DEFAULT_COLORS.length];

    steps.push({
      phase: "dfs2",
      visited: new Set(visited),
      current: u,
      foundSccs: [...foundSccs, bucket],
      sccColors: { ...sccColors },
      showTransposed: true,
      finishOrderStack: [...vizStack],
      discoveryTimes: { ...discoveryTimes2 },
      finishTimes: { ...finishTimes2 },
    });

    (adjT[u] || []).forEach((v) => {
      if (!visited.has(v)) dfs2(v, bucket);
    });

    time++;
    finishTimes2[u] = time;
    steps.push({
      ...steps[steps.length - 1],
      finishTimes: { ...finishTimes2 },
    });
  };

  while (vizStack.length) {
    const u = vizStack.pop();
    if (!visited.has(u)) {
      const bucket = [];
      foundSccs.push(bucket);
      dfs2(u, bucket);
      sccIndex++;
    }
  }

  steps.push({
    phase: "finished",
    visited: new Set(visited),
    current: null,
    foundSccs: [...foundSccs],
    sccColors: { ...sccColors },
    showTransposed: false,
    finishOrderStack: [],
    finished: true,
    result: `Found ${foundSccs.length} SCCs.`,
    discoveryTimes: { ...discoveryTimes2 },
    finishTimes: { ...finishTimes2 },
  });

  return steps;
}

/**
 * Bellman-Ford
 * - Handles graphs with negative edges, detects negative cycles
 * - Returns steps tracking distances updates per relaxation
 */
export function runBellmanFord(nodes, edges, options = {}) {
  const { isDirected = false, startNode, endNode } = options;
  const steps = [];

  if (!startNode || !nodes.some((n) => n.id === startNode)) {
    steps.push({ finished: true });
    return steps;
  }

  const distances = {};
  const previous = {};
  nodes.forEach((n) => {
    distances[n.id] = n.id === startNode ? 0 : Infinity;
    previous[n.id] = null;
  });

  // initial state: mark visited as nodes with finite distance (start only)
  steps.push({
    distances: { ...distances },
    visited: new Set(
      Object.keys(distances).filter((id) => distances[id] !== Infinity),
    ),
    current: startNode,
    path: [],
    previous: { ...previous },
  });

  // Relax edges |V|-1 times
  const edgeList = edges.map((e) => ({
    from: e.from,
    to: e.to,
    weight: e.weight ?? 1,
  }));

  // Track last node that was relaxed/updated so we can show a path if endNode not provided
  let lastUpdated = null;

  for (let i = 1; i <= nodes.length - 1; i++) {
    let updated = false;
    for (const e of edgeList) {
      const { from, to, weight } = e;
      if (
        distances[from] !== Infinity &&
        distances[from] + weight < distances[to]
      ) {
        distances[to] = distances[from] + weight;
        previous[to] = from;
        updated = true;
        lastUpdated = to;
        steps.push({
          distances: { ...distances },
          visited: new Set(
            Object.keys(distances).filter((id) => distances[id] !== Infinity),
          ),
          current: to,
          path: buildPath(previous, endNode || to),
          previous: { ...previous },
        });
      }
      if (!isDirected) {
        // also consider reverse if undirected
        if (
          distances[to] !== Infinity &&
          distances[to] + weight < distances[from]
        ) {
          distances[from] = distances[to] + weight;
          previous[from] = to;
          updated = true;
          lastUpdated = from;
          steps.push({
            distances: { ...distances },
            visited: new Set(
              Object.keys(distances).filter((id) => distances[id] !== Infinity),
            ),
            current: from,
            path: buildPath(previous, endNode || from),
            previous: { ...previous },
          });
        }
      }
    }
    if (!updated) break;
  }

  // Check for negative cycles
  let negativeCycle = false;
  for (const e of edgeList) {
    const { from, to, weight } = e;
    if (
      distances[from] !== Infinity &&
      distances[from] + weight < distances[to]
    ) {
      negativeCycle = true;
      break;
    }
    if (!isDirected) {
      if (
        distances[to] !== Infinity &&
        distances[to] + weight < distances[from]
      ) {
        negativeCycle = true;
        break;
      }
    }
  }

  // Determine final path target: prefer explicit endNode, otherwise use lastUpdated if present
  const finalTarget = endNode || lastUpdated || null;

  steps.push({
    distances: { ...distances },
    visited: new Set(
      Object.keys(distances).filter((id) => distances[id] !== Infinity),
    ),
    finished: true,
    result: negativeCycle
      ? "Negative cycle detected"
      : finalTarget
        ? `Distance to ${finalTarget}: ${distances[finalTarget] === Infinity ? "∞" : distances[finalTarget]}`
        : "Finished",
    path: buildPath(previous, finalTarget),
    previous: { ...previous },
  });

  return steps;
}

/**
 * Topological Sort (Kahn's algorithm)
 * - Only meaningful for directed acyclic graphs (DAGs)
 * - Returns steps showing indegree processing and final order, or detection of cycle
 */
export function runTopologicalSort(nodes, edges, options = {}) {
  // Respect caller's isDirected option; topological sort requires a directed graph.
  const isDirected =
    options.isDirected !== undefined ? options.isDirected : true;
  const steps = [];

  if (!isDirected) {
    // Inform the caller to enable directed mode and return an immediately finished step.
    steps.push({
      finished: true,
      result:
        "Topological sort requires a directed graph. Enable 'Directed Graph' mode.",
      order: [],
    });
    return steps;
  }

  const adj = buildAdjacency(nodes, edges, isDirected, false);
  const indegree = {};
  nodes.forEach((n) => (indegree[n.id] = 0));
  edges.forEach((e) => {
    if (indegree[e.to] === undefined) indegree[e.to] = 0;
    indegree[e.to]++;
  });

  const queue = [];
  for (const id in indegree) {
    if (indegree[id] === 0) queue.push(id);
  }

  const stepsInner = [];
  stepsInner.push({
    queue: [...queue],
    indegree: { ...indegree },
    order: [],
  });

  const order = [];
  while (queue.length) {
    const u = queue.shift();
    order.push(u);
    stepsInner.push({
      queue: [...queue],
      indegree: { ...indegree },
      current: u,
      order: [...order],
    });

    for (const v of adj[u] || []) {
      indegree[v]--;
      stepsInner.push({
        queue: [...queue],
        indegree: { ...indegree },
        current: u,
        order: [...order],
      });
      if (indegree[v] === 0) {
        queue.push(v);
        stepsInner.push({
          queue: [...queue],
          indegree: { ...indegree },
          current: v,
          order: [...order],
        });
      }
    }
  }

  if (order.length !== nodes.length) {
    // cycle detected
    stepsInner.push({
      finished: true,
      result: "Graph has at least one cycle (topological sort not possible)",
      order,
    });
  } else {
    stepsInner.push({
      finished: true,
      result: "Topological order computed",
      order,
    });
  }

  return stepsInner;
}

/**
 * Convenience default export: registry of algorithms
 */
export default {
  bfs: runBFS,
  dfs: runDFS,
  dijkstra: runDijkstra,
  scc: runSCC,
  bellmanFord: runBellmanFord,
  topologicalSort: runTopologicalSort,
};
