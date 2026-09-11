"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Fetch event detail by eventId and build the combined
 * Initial-Division-Race category list. Shared by every judge page.
 */
export default function useEventDetail(eventId) {
  const [eventDetail, setEventDetail] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    const fetchEventDetail = async () => {
      setLoadingEvent(true);
      try {
        const res = await fetch(`/api/matches/${eventId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!cancelled) setEventDetail(data?.event || data || null);
      } catch (err) {
        console.error("❌ Event detail error:", err);
        if (!cancelled) setEventDetail(null);
      } finally {
        if (!cancelled) setLoadingEvent(false);
      }
    };
    fetchEventDetail();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const combinedCategories = useMemo(() => {
    const list = [];
    const initials = eventDetail?.categoriesInitial || [];
    const divisions = eventDetail?.categoriesDivision || [];
    const races = eventDetail?.categoriesRace || [];
    initials.forEach((initial) => {
      divisions.forEach((division) => {
        races.forEach((race) => {
          list.push({
            label: `${initial.name} - ${division.name} - ${race.name}`,
            value: `${initial.value}|${division.value}|${race.value}`,
          });
        });
      });
    });
    return list;
  }, [eventDetail]);

  return { eventDetail, loadingEvent, combinedCategories };
}
