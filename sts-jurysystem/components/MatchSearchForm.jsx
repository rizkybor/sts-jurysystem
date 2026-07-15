"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LEVELS = [
  "Classification - A",
  "Classification - B",
  "Classification - C",
  "Classification - D",
  "Classification - E",
  "Classification - F",
  "Classification - G",
  "Classification - H",
  "Classification - I",
];

const MatchSearchForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [level, setLevel] = useState(searchParams.get("level") || "All");

  // Sinkronkan form dengan URL (mis. saat reload halaman dengan ?level=... di URL)
  useEffect(() => {
    setKeyword(searchParams.get("q") || "");
    setLevel(searchParams.get("level") || "All");
  }, [searchParams]);

  const navigate = (nextKeyword, nextLevel) => {
    const params = new URLSearchParams();
    if (nextKeyword.trim()) params.set("q", nextKeyword.trim());
    if (nextLevel && nextLevel !== "All") params.set("level", nextLevel);

    router.push(`/matches${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate(keyword, level);
  };

  // Dropdown level langsung mem-filter saat dipilih, tidak perlu klik Search
  const handleLevelChange = (nextLevel) => {
    setLevel(nextLevel);
    navigate(keyword, nextLevel);
  };

  const hasActiveFilter = Boolean(keyword.trim()) || level !== "All";

  const resetFilters = () => {
    setKeyword("");
    setLevel("All");
    router.push("/matches");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Keyword */}
      <div>
        <label htmlFor="keyword" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Keyword
        </label>
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z" />
          </svg>
          <input
            type="text"
            id="keyword"
            placeholder="Event name..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-stsHighlight focus:border-transparent transition"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {/* Level */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Classification Level
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleLevelChange("All")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              level === "All"
                ? "bg-sts text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {LEVELS.map((lvl) => {
            const short = lvl.split("-").pop().trim();
            const active = level === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => handleLevelChange(lvl)}
                title={lvl}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  active
                    ? "bg-sts text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {short}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sts to-stsDark text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200"
        >
          Apply Filter
        </button>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={resetFilters}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition"
          >
            Reset
          </button>
        )}
      </div>
    </form>
  );
};

export default MatchSearchForm;
