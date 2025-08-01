import React from "react";

/**
 * Basic Slider component for UI.
 * Props:
 * - value: [number] (array with one number, for compatibility with your usage)
 * - onValueChange: function(newValueArray)
 * - min: number
 * - max: number
 * - step: number
 * - className: string
 */
export function Slider({
  value = [0],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className = "",
}) {
  const handleChange = (e) => {
    const newValue = [Number(e.target.value)];
    if (onValueChange) onValueChange(newValue);
  };

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={handleChange}
      className={`slider ${className}`}
      style={{ width: "100%" }}
    />
  );
}

export default Slider;
