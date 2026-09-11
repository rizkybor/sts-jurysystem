"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Fetch registered teams for a category via the shared judge-tasks
 * endpoint, parameterized by eventName (SPRINT/SLALOM/DRR/HEADTOHEAD).
 * Shared by every judge page.
 */
export default function useJudgeTeams({
  eventId,
  eventName,
  selectedCategory,
  pushToast,
}) {
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  const fetchTeams = useCallback(
    async ({ silent = false } = {}) => {
      if (!eventId || !selectedCategory) return;
      if (!silent) setLoadingTeams(true);
      try {
        const [initialId, divisionId, raceId] = selectedCategory.split("|");
        const res = await fetch(
          `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=${eventName}${
            silent ? `&t=${Date.now()}` : ""
          }`
        );
        const data = await res.json();
        if (res.ok && data?.success) {
          setTeams(data.teams || []);
        } else if (!silent) {
          setTeams([]);
          pushToast?.({
            title: "Data Tim Kosong",
            text: "Tidak ada tim untuk kategori ini",
            type: "info",
          });
        }
      } catch (err) {
        console.error(`❌ Failed to fetch ${eventName} teams:`, err);
        if (!silent) {
          setTeams([]);
          pushToast?.({
            title: "Error",
            text: "Gagal memuat data tim",
            type: "error",
          });
        }
      } finally {
        if (!silent) setLoadingTeams(false);
      }
    },
    [eventId, eventName, selectedCategory, pushToast]
  );

  useEffect(() => {
    if (!eventId || !selectedCategory) return;
    setLoadingTeams(true);
    fetchTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, eventName, selectedCategory]);

  const refreshTeams = useCallback(() => fetchTeams({ silent: true }), [
    fetchTeams,
  ]);

  const resetTeams = useCallback(() => {
    setTeams([]);
    setLoadingTeams(true);
  }, []);

  return { teams, loadingTeams, refreshTeams, resetTeams };
}
