import { useRef, useEffect, useState, useCallback } from "react";

/**
 * useScaledCoords
 * - Keeps a canvas's internal resolution (width/height attributes) in sync with its displayed size
 * - Provides a helper to convert mouse/touch client coordinates to canvas coordinate space
 * - Notifies an optional onResize callback when the canvas size changes (after the first measurement)
 *
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef - ref to the target canvas element
 * @param {(prev: {width:number,height:number}, next: {width:number,height:number}) => void} [onResize] - optional callback on size changes
 * @returns {{ getScaledCoords: (e: MouseEvent | PointerEvent | TouchEvent) => {x:number, y:number}, canvasDimensions: {width:number, height:number} }}
 */
export default function useScaledCoords(canvasRef, onResize) {
  // Track current canvas dimensions
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 800,
    height: 500,
  });

  // Remember previous measured rect to feed onResize with before/after
  const prevRectRef = useRef({ width: null, height: null });

  // Convert client coordinates to canvas coordinate space using current device pixel ratio of the canvas
  const getScaledCoords = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      // Use the canvas element's intrinsic size (width/height attributes), which we keep in sync with its display size
      const scaleX = canvas.width / rect.width || 1;
      const scaleY = canvas.height / rect.height || 1;

      const clientX = "clientX" in e ? e.clientX : 0;
      const clientY = "clientY" in e ? e.clientY : 0;

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      return { x, y };
    },
    [canvasRef],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const prev = prevRectRef.current;

        // Sync the canvas internal resolution to match displayed size
        canvas.width = width;
        canvas.height = height;

        setCanvasDimensions({ width, height });

        // Notify parent about size change (skip first call where prev is null)
        if (
          typeof onResize === "function" &&
          prev.width !== null &&
          (prev.width !== width || prev.height !== height)
        ) {
          try {
            onResize(prev, { width, height });
          } catch (err) {
            // Fail gracefully
            console.warn("onResize callback error:", err);
          }
        }

        prevRectRef.current = { width, height };
      }
    });

    // Initialize with current size and start observing
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    setCanvasDimensions({ width: rect.width, height: rect.height });
    prevRectRef.current = { width: rect.width, height: rect.height };
    resizeObserver.observe(canvas);

    return () => {
      try {
        resizeObserver.unobserve(canvas);
      } catch {
        // ignore if already unobserved
      }
      try {
        resizeObserver.disconnect();
      } catch {
        // ignore if already disconnected
      }
    };
  }, [canvasRef, onResize]);

  return { getScaledCoords, canvasDimensions };
}
