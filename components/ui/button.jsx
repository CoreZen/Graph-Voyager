import React from "react";

export function Button({
  children,
  onClick,
  className = "",
  variant = "default",
  size = "md",
  disabled = false,
  ...props
}) {
  // Compose Tailwind classes for dark theme and pass-through
  const base =
    "inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    default: "bg-emerald-600 text-white hover:bg-emerald-700",
    outline:
      "border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700",
  };
  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        base,
        variants[variant] || "",
        sizes[size] || "",
        className,
      ].join(" ")}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
