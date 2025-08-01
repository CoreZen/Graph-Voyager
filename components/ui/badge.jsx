import React from "react";

export default function Badge({
  children,
  className = "",
  variant = "solid",
  ...props
}) {
  const base =
    "inline-block px-2 py-1 rounded text-xs font-semibold border transition-colors";
  const variants = {
    solid: "bg-slate-800 text-slate-200 border border-slate-700",
    outline: "bg-transparent text-slate-300 border border-slate-600",
  };
  return (
    <span
      className={`${base} ${variants[variant] || ""} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
