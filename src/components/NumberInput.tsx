"use client";

import { useState, useRef } from "react";

// Number input that allows empty during editing, saves on blur
export default function NumberInput({
  value,
  onChange,
  className,
  min,
  max,
  decimal,
}: {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  min?: number;
  max?: number;
  decimal?: boolean; // allow e.g. 22.5 (kg); otherwise whole numbers
}) {
  const [localValue, setLocalValue] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  // Sync local value when external value changes (but not while focused)
  const lastValue = useRef(value);
  if (value !== lastValue.current && !isFocused) {
    setLocalValue(String(value));
    lastValue.current = value;
  }

  return (
    <input
      type="number"
      step={decimal ? "0.5" : undefined}
      inputMode={decimal ? "decimal" : "numeric"}
      value={isFocused ? localValue : String(value)}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={() => {
        setIsFocused(true);
        setLocalValue(String(value));
      }}
      onBlur={() => {
        setIsFocused(false);
        const num = (decimal ? parseFloat(localValue) : parseInt(localValue)) || 0;
        onChange(num);
      }}
      className={className}
      min={min}
      max={max}
    />
  );
}
