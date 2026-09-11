"use client";

import Link from "next/link";

/**
 * Sticky compact top bar: back button + event name/date, so the bulk of
 * a small screen stays dedicated to the form instead of a large static
 * event-detail card.
 */
export default function JudgeTopBar({ backHref, raceLabel, eventDetail, loadingEvent }) {
  const dateRange =
    eventDetail?.startDateEvent && eventDetail?.endDateEvent
      ? `${new Date(eventDetail.startDateEvent).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        })} – ${new Date(eventDetail.endDateEvent).toLocaleDateString(
          "id-ID",
          { day: "2-digit", month: "short", year: "numeric" }
        )}`
      : null;

  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
      <div className="h-0.5 bg-sts" />
      <div className="max-w-2xl mx-auto px-4 py-2 flex items-center gap-3">
        <Link
          href={backHref}
          className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full text-stsDark hover:bg-sts/10 transition"
          aria-label="Back to Judge Dashboard"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {raceLabel}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {loadingEvent
              ? "Loading event..."
              : eventDetail
              ? `${eventDetail.eventName}${dateRange ? ` • ${dateRange}` : ""}`
              : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
