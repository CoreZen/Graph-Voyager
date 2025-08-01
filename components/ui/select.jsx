import React, { useState, useRef, useEffect } from "react";

export function Select({ value, onValueChange, children }) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef(null);

  // Find the label for the selected value
  const selectedLabel = React.Children.toArray(children).find(
    (child) => child.props.value === value,
  )?.props.children || <span className="text-slate-400">Select...</span>;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setOpen(false);
      }
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
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-slate-700 border border-slate-600 rounded shadow-lg">
          {dropdownItems}
        </div>
      )}
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
