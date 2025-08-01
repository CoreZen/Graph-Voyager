# Graph Voyager

Graph Voyager is an interactive web application for visualizing and running algorithms on graph data structures. Built with React, Vite, and Tailwind CSS, it provides a simple interface for users to create, edit, and analyze graphs, making it ideal for learning and demonstration purposes.

## 🌐 Live Demo

View the latest deployed version on GitHub Pages:  
[https://corezen.github.io/Graph-Voyager/](https://corezen.github.io/Graph-Voyager/)

---

## Project Description

Graph Voyager enables users to:

- **Visualize Graphs:** Draw nodes and connect them with edges on a canvas.
- **Edit Graphs:** Add, delete, and move nodes; connect nodes with edges (including weighted and directed edges).
- **Run Algorithms:** Step through and visualize Breadth-First Search (BFS), Depth-First Search (DFS), Dijkstra's Algorithm, and Strongly Connected Components (SCC).
- **Sample Graphs:** Quickly generate random graphs or load sample graphs (tree, weighted, SCC).
- **Algorithm Insights:** View algorithm progress, visited nodes, paths, and results in a sidebar.
- **Adjust Animation:** Control the speed of algorithm animations.


The project leverages modern web technologies for performance and maintainability, but is currently focused on core graph editing and algorithm visualization.

---

## Sidebar Description

The sidebar in Graph Voyager serves as your control panel for graph algorithms and graph management. It allows you to:

- **Select and Run Algorithms:** Choose which algorithm to visualize and control animation speed.
- **Switch Graph Type:** Toggle between directed and undirected graphs.
- **Generate or Clear Graphs:** Create random graphs, load sample graphs, or clear the current graph.
- **View Algorithm Status:** See progress, visited nodes, paths, and results as the algorithm runs.

The sidebar is designed to keep essential controls and information at your fingertips, making graph algorithm exploration straightforward.

---

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Run locally:**
   ```sh
   npm run dev
   ```

3. **Build for production:**
   ```sh
   npm run build
   ```

4. **Deploy to GitHub Pages:**
   ```sh
   npm run deploy
   ```

---

## License

This project is licensed under the ISC License.

---

## Contributing

Pull requests and suggestions are welcome! Please open an issue to discuss your ideas or report bugs.

---

**Made with ❤️ using React, Vite, and Tailwind CSS.**

---

## TODO

- [ ] Add pan and zoom functionality to the canvas
- [ ] Implement export and import (save/load) for graph data
- [ ] Add export to image (PNG/SVG)
- [ ] Improve mobile responsiveness and accessibility
- [ ] Add more graph algorithms (e.g., minimum spanning tree, topological sort)
- [ ] Enhance sidebar with collapsible sections and search