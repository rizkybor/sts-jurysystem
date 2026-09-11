"use client";

import { useEffect, useRef } from "react";

/**
 * Penalty value button grid. Generically fixes the "stale penalty after
 * switching gate/section" bug: whenever the `values` array identity
 * changes (i.e. the caller switched context), any currently selected
 * value that is no longer in the new list is cleared automatically.
 */
export default function JudgePenaltyGrid({
  values,
  selected,
  onChange,
  label = "Nilai Penalty (detik)",
  columns = 4,
  disabled = false,
}) {
  const prevValuesKey = useRef(null);

  useEffect(() => {
    const key = values.join(",");
    if (prevValuesKey.current !== null && prevValuesKey.current !== key) {
      if (selected !== null && !values.includes(selected)) {
        onChange(null);
      }
    }
    prevValuesKey.current = key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  if (!values.length) return null;

  const gridColsClass =
    columns === 3
      ? "grid-cols-3"
      : columns === 2
      ? "grid-cols-2"
      : "grid-cols-4";

  return (
    <div>
      <label className="block text-gray-700 mb-2 font-medium">{label}</label>
      <div className={`grid ${gridColsClass} gap-2`}>
        {values.map((v) => (
          <button
            key={String(v)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(v)}
            aria-pressed={selected === v}
            className={`min-h-[48px] py-2 px-2 rounded-xl border text-sm font-semibold transition disabled:opacity-50 ${
              selected === v
                ? "bg-sts text-white border-sts shadow-sm"
                : "bg-white border-gray-300 text-gray-700 hover:border-sts/50"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      {selected === null && (
        <p className="mt-1.5 text-xs text-gray-500">
          Pilih salah satu nilai penalty.
        </p>
      )}
    </div>
  );
}
