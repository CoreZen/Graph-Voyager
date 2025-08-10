import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export function Select({ value, onValueChange, children }) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef(null);

  // Find the label for the selected value
  const selectedLabel = React.Children.toArray(children).find(
    (child) => child.props.value === value,
  )?.props.children || <span className="text-slate-400">Select...</span>;

  // Close dropdown when clicking outside (account for portal dropdown)
  useEffect(() => {
    function handleClickOutside(event) {
      const target = event.target;
      // If the click is inside the main select element, do nothing
      if (selectRef.current && selectRef.current.contains(target)) return;
      // If the click is inside the portaled dropdown, do nothing
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Render dropdown items with correct handler
  const dropdownItems = React.Children.toArray(children).map((child) =>
    React.cloneElement(child, {
      onClick: () => {
        console.log("Algorithm selected:", child.props.value);
        if (onValueChange) onValueChange(child.props.value);
        setOpen(false);
      },
    }),
  );

  // Dropdown positioning state used to render the dropdown via a portal to the body
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState(null);

  // Compute dropdown position with upward fallback when there's insufficient space below.
  const computePosition = () => {
    if (!selectRef.current) return null;
    const rect = selectRef.current.getBoundingClientRect();
    const left = rect.left + window.scrollX;
    const width = rect.width;
    const margin = 6;
    const maxHeight = 240; // px (corresponds to max-h-60)
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    let top;
    // If not enough space below and there's enough space above, position above
    if (spaceBelow < 120 && spaceAbove > maxHeight + margin) {
      top =
        rect.top + window.scrollY - Math.min(maxHeight, spaceAbove) - margin;
    } else {
      top = rect.bottom + window.scrollY + margin;
    }
    return {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      zIndex: 9999,
      maxHeight: `${maxHeight}px`,
      overflow: "auto",
    };
  };

  useLayoutEffect(() => {
    if (!open) {
      setDropdownStyle(null);
      return;
    }
    // Initial compute
    setDropdownStyle(computePosition());
    // Recompute on next frame to account for any layout changes
    const raf = requestAnimationFrame(() => {
      setDropdownStyle(computePosition());
    });
    return () => cancelAnimationFrame(raf);
  }, [open, selectRef]);

  // Recompute when scrolling or resizing so the dropdown stays aligned and doesn't clip
  useEffect(() => {
    if (!open) return;
    const handler = () => setDropdownStyle(computePosition());
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open]);

  return (
    <div className="relative inline-block w-full" ref={selectRef}>
      <div
        className="bg-slate-700 border border-slate-600 rounded px-3 py-2 cursor-pointer text-slate-200"
        onClick={() => setOpen((o) => !o)}
        tabIndex={0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedLabel}
      </div>
      {open &&
        (typeof document !== "undefined" && dropdownStyle ? (
          createPortal(
            <div
              ref={dropdownRef}
              style={dropdownStyle}
              className="bg-slate-700 border border-slate-600 rounded shadow-lg max-h-60 overflow-auto"
              role="listbox"
            >
              {dropdownItems}
            </div>,
            document.body,
          )
        ) : (
          // Fallback: render inline if portal isn't available yet
          <div className="absolute z-50 left-0 mt-1 w-full bg-slate-700 border border-slate-600 rounded shadow-lg max-h-60 overflow-auto">
            {dropdownItems}
          </div>
        ))}
    </div>
  );
}

export function SelectTrigger({ children, className }) {
  return <div className={className}>{children}</div>;
}

export function SelectContent({ children, className }) {
  return <div className={className}>{children}</div>;
}

export function SelectItem({ value, children, onClick, className }) {
  return (
    <div
      className={`px-3 py-2 cursor-pointer hover:bg-slate-600 ${className || ""}`}
      role="option"
      aria-selected="false"
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function SelectValue({ children }) {
  return <span>{children}</span>;
}
