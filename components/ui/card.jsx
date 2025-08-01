import React from "react";

export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`rounded-lg border border-slate-700 bg-slate-900/50 backdrop-blur-sm shadow-lg ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }) {
  return (
    <div
      className={`px-6 py-4 border-b border-slate-700 bg-slate-800/70 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "", ...props }) {
  return (
    <h2 className={`font-bold text-xl text-slate-200 ${className}`} {...props}>
      {children}
    </h2>
  );
}

export function CardContent({ children, className = "", ...props }) {
  return (
    <div className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
