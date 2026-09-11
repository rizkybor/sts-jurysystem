"use client";

import { useEffect, useState } from "react";

/**
 * Fetch the logged-in judge's profile + their UserJudgeAssignments list.
 * Shared by every judge page.
 */
export default function useJudgeAssignments() {
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoadingAssignments(true);
      try {
        const judgesRes = await fetch("/api/judges", { cache: "no-store" });
        if (!judgesRes.ok) return;
        const judgesData = await judgesRes.json();
        if (cancelled) return;
        setUser(judgesData.user || null);

        const userEmail = judgesData.user?.email;
        if (!userEmail) return;

        const assignmentsRes = await fetch(
          `/api/assignments?email=${encodeURIComponent(userEmail)}`,
          { cache: "no-store" }
        );
        if (!assignmentsRes.ok) return;
        const assignmentsData = await assignmentsRes.json();
        if (cancelled) return;
        const list = Array.isArray(assignmentsData?.data)
          ? assignmentsData.data
          : Array.isArray(assignmentsData)
          ? assignmentsData
          : [];
        setAssignments(list);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingAssignments(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, assignments, loadingAssignments };
}
