"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  const handleLevelChange = (e) => {
    const nextLevel = e.target.value;
    setLevel(nextLevel);
    navigate(keyword, nextLevel);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 mx-auto max-w-2xl w-full flex flex-col md:flex-row items-center"
    >
      {/* Input pencarian keyword */}
      <div className="w-full md:w-3/5 md:pr-2 mb-4 md:mb-0">
        <label htmlFor="keyword" className="sr-only">
          Keyword / Event Name
        </label>
        <input
          type="text"
          id="keyword"
          placeholder="Enter keyword or event name"
          className="w-full px-4 py-2 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring focus:ring-stsHighlight"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {/* Dropdown Level Classification */}
      <div className="w-full md:w-2/5 md:pl-2">
        <label htmlFor="level" className="sr-only">
          Classification Level
        </label>
        <select
          id="level"
          className="w-full px-4 py-2 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring focus:ring-stsHighlight cursor-pointer"
          value={level}
          onChange={handleLevelChange}
        >
          <option value="All">All Levels</option>
          <option value="Classification - A">Classification - A</option>
          <option value="Classification - B">Classification - B</option>
          <option value="Classification - C">Classification - C</option>
          <option value="Classification - D">Classification - D</option>
          <option value="Classification - E">Classification - E</option>
          <option value="Classification - F">Classification - F</option>
          <option value="Classification - G">Classification - G</option>
          <option value="Classification - H">Classification - H</option>
          <option value="Classification - I">Classification - I</option>
        </select>
      </div>

      {/* Tombol Search */}
      <button
        type="submit"
        className="
    md:ml-4 mt-4 md:mt-0 w-full md:w-auto
    px-6 py-2 rounded-xl
    bg-white text-black
    hover:bg-stsDarkHiglight hover:text-white
    focus:outline-none focus:ring-2 focus:ring-stsDark
    transition-all duration-300 ease-out
    shadow-sm hover:shadow-[0_4px_12px_rgba(24,116,165,0.25)]
    cursor-pointer
  "
      >
        Search
      </button>
    </form>
  );
};

export default MatchSearchForm;
