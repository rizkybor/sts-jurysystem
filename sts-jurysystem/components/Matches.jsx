"use client";
import { useState, useEffect } from "react";
import MatchCard from "@/components/MatchCard";
import Spinner from "@/components/Spinner";
import Pagination from "@/components/Pagination";

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [totalMatches, setTotalMatches] = useState(0);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch(`/api/matches?page=${page}&pageSize=${pageSize}`);
        if (!res.ok) throw new Error("Failed to fetch matches");

        const data = await res.json();

        // --- Sort by startDateEvent closest to now (upcoming first) ---
        const now = Date.now();
        const toTime = (v) => {
          if (!v) return NaN;
          const t = new Date(v).getTime();
          return Number.isNaN(t) ? NaN : t;
        };

        const sorted = [...(data.events || [])].sort((a, b) => {
          const ta = toTime(a.startDateEvent);
          const tb = toTime(b.startDateEvent);

          // handle invalid dates last
          const aValid = Number.isFinite(ta);
          const bValid = Number.isFinite(tb);
          if (aValid && !bValid) return -1;
          if (!aValid && bValid) return 1;
          if (!aValid && !bValid) return 0;

          const da = ta - now;
          const db = tb - now;

          const aFuture = da >= 0;
          const bFuture = db >= 0;

          // Upcoming events first
          if (aFuture && !bFuture) return -1;
          if (!aFuture && bFuture) return 1;

          // If both upcoming: sooner first
          if (aFuture && bFuture) return da - db;

          // If both past: the most recent (closest in the past) first
          return Math.abs(da) - Math.abs(db);
        });

        setMatches(sorted);
        setTotalMatches(data.total);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [page, pageSize]);

  const handlePageChange = (newPage) => setPage(newPage);

  return loading ? (
    <Spinner />
  ) : (
    <section className="px-4 py-6">
      <div className="container-xl lg:container m-auto px-4 py-6">
        {matches.length === 0 ? (
          <p>No matches found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {matches.map((match) => (
              <MatchCard key={match._id} match={match} />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={totalMatches}
          onPageChange={handlePageChange}
        />
      </div>
    </section>
  );
};

export default Matches;