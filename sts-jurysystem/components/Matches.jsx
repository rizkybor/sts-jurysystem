"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import MatchCard from "@/components/MatchCard";
import Spinner from "@/components/Spinner";
import Pagination from "@/components/Pagination";

const Matches = () => {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const level = searchParams.get("level") || "All";

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [totalMatches, setTotalMatches] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [q, level]);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (q.trim()) params.set("q", q.trim());
        if (level && level !== "All") params.set("level", level);

        const res = await fetch(`/api/matches?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch matches");

        const data = await res.json();

        const now = Date.now();
        const toTime = (v) => {
          const t = new Date(v || "").getTime();
          return Number.isNaN(t) ? Infinity : t;
        };
        const sorted = [...(data.events || [])].sort((a, b) => {
          const da = toTime(a.startDateEvent) - now;
          const db = toTime(b.startDateEvent) - now;
          const af = da >= 0, bf = db >= 0;
          if (af !== bf) return af ? -1 : 1;
          return Math.abs(da) - Math.abs(db);
        });

        setMatches(sorted);
        setTotalMatches(data.total);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [page, pageSize, q, level]);

  const handlePageChange = (newPage) => setPage(newPage);

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* --- Main Content --- */}
      <section className="flex-1 px-4 pt-10">
        <div className="container-xl lg:container m-auto px-4">
          {matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-center text-gray-500">
              {/* Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-20 h-20 text-sts/50 mb-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M11 4a7 7 0 0 1 7 7 7 7 0 0 1-7 7 7 7 0 0 1-7-7 7 7 0 0 1 7-7z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-gray-700 mb-1">
                No Events Found
              </h3>
              <p className="text-gray-500 max-w-md">
                We couldn’t find any matches for your search criteria. Try adjusting your keyword or classification level.
              </p>
              <button
                onClick={() => (window.location.href = "/matches")}
                className="mt-6 px-6 py-3 rounded-lg bg-sts text-white hover:bg-stsHighlight transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {matches.map((match) => (
                <MatchCard key={match._id} match={match} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* --- Footer Pagination --- */}
      <footer >
        <div className="container-xl lg:container m-auto px-4 py-4 flex justify-center">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={totalMatches}
            onPageChange={handlePageChange}
          />
        </div>
      </footer>
    </div>
  );
};

export default Matches;