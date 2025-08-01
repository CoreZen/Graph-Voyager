import React from "react";

export function Switch({ checked, onCheckedChange }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onCheckedChange(e.target.checked)}
        style={{ display: "none" }}
      />
      <span
        style={{
          width: 40,
          height: 22,
          background: checked ? "#10b981" : "#6b7280",
          borderRadius: 11,
          position: "relative",
          transition: "background 0.2s",
          display: "inline-block",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: checked ? 20 : 2,
            top: 2,
            width: 18,
            height: 18,
            background: "#fff",
            borderRadius: "50%",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            transition: "left 0.2s",
          }}
        />
      </span>
    </label>
  );
}
