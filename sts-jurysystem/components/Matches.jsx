"use client";
import { useState, useEffect } from "react";
import MatchCard from "@/components/MatchCard"; // Komponen untuk menampilkan match
import Spinner from "@/components/Spinner";
import Pagination from "@/components/Pagination";

const Matches = () => {
  const [matches, setMatches] = useState([]); // State untuk data matches
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [totalMatches, setTotalMatches] = useState(0);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch(
          `/api/matches?page=${page}&pageSize=${pageSize}`
        );

        if (!res.ok) {
          throw new Error("Failed to fetch matches");
        }

        const data = await res.json();
        setMatches(data.events);
        setTotalMatches(data.total);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [page, pageSize]);

  console.log('tes data')

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

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
