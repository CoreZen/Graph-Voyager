import React from "react";

/**
 * GraphToolbar
 *
 * A dedicated toolbar for graph canvas modes and common actions.
 * This component is purely presentational and communicates via props,
 * adhering to Single Responsibility and Dependency Inversion principles.
 *
 * Props:
 * - mode: string ("select" | "setstart" | "setend" | "add" | "connect" | "delete")
 * - onChangeMode: (nextMode: string) => void
 * - onFit: () => void
 * - className?: string
 *
 * Optional UX props (not functionally required but useful):
 * - disabled?: boolean — disables all interactions
 */
export default function GraphToolbar({
  mode,
  onChangeMode,
  onFit,
  className = "",
  disabled = false,
}) {
  const buttonBase =
    "px-3 py-1 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";

  const inactive =
    "bg-slate-700 text-slate-300 hover:bg-slate-600 focus:ring-offset-1 focus:ring-offset-slate-800";

  const buttons = [
    {
      key: "select",
      label: "Select",
      activeClass: "bg-blue-600 text-white",
      inactiveClass: inactive,
      onClick: () => onChangeMode && onChangeMode("select"),
    },
    {
      key: "setstart",
      label: "Set Start",
      activeClass: "bg-red-600 text-white",
      inactiveClass: inactive,
      onClick: () => onChangeMode && onChangeMode("setstart"),
    },
    {
      key: "setend",
      label: "Set End",
      activeClass: "bg-amber-500 text-white",
      inactiveClass: inactive,
      onClick: () => onChangeMode && onChangeMode("setend"),
    },
    {
      key: "add",
      label: "Add Nodes",
      activeClass: "bg-green-600 text-white",
      inactiveClass: inactive,
      onClick: () => onChangeMode && onChangeMode("add"),
    },
  ];

  const rightButtons = [
    {
      key: "connect",
      label: "Connect Edges",
      activeClass: "bg-purple-600 text-white",
      inactiveClass: inactive,
      onClick: () => onChangeMode && onChangeMode("connect"),
    },
    {
      key: "delete",
      label: "Delete",
      activeClass: "bg-red-600 text-white",
      inactiveClass: inactive,
      onClick: () => onChangeMode && onChangeMode("delete"),
    },
  ];

  return (
    <div className={`w-full ${className}`}>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {buttons.map((b) => {
          const isActive = mode === b.key;
          return (
            <button
              key={b.key}
              type="button"
              aria-pressed={isActive}
              disabled={disabled}
              onClick={b.onClick}
              className={[
                buttonBase,
                isActive ? b.activeClass : b.inactiveClass,
              ].join(" ")}
            >
              {b.label}
            </button>
          );
        })}

        {/* Fit action is not a mode toggle */}
        <button
          type="button"
          onClick={onFit}
          disabled={disabled}
          className={`${buttonBase} bg-indigo-600 text-white hover:bg-indigo-700`}
        >
          Fit
        </button>

        {rightButtons.map((b) => {
          const isActive = mode === b.key;
          return (
            <button
              key={b.key}
              type="button"
              aria-pressed={isActive}
              disabled={disabled}
              onClick={b.onClick}
              className={[
                buttonBase,
                isActive ? b.activeClass : b.inactiveClass,
              ].join(" ")}
            >
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
