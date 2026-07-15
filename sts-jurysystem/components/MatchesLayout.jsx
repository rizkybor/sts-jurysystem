"use client";
import { useState } from "react";
import FilterSidebar from "@/components/FilterSidebar";
import MatchSearchForm from "@/components/MatchSearchForm";
import Matches from "@/components/Matches";

export default function MatchesLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Mobile filter trigger */}
      <div className="lg:hidden mb-5">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white ring-1 ring-gray-200 shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18M6 9.75h12M10.5 15h3" />
          </svg>
          Filter Events
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <FilterSidebar
          title="Filter Events"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        >
          <MatchSearchForm />
        </FilterSidebar>

        <main className="flex-1 min-w-0 w-full">
          <Matches />
        </main>
      </div>
    </div>
  );
}
