"use client";

import { useSearchParams, usePathname } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import JudgeChatWidget from "@/components/JudgeChatWidget";

const CATEGORY_BY_SEGMENT = {
  sprint: "sprint",
  headtohead: "h2h",
  slalom: "slalom",
  downriverrace: "drr",
  raftingcross: "rx",
};

export default function JudgesLayout({ children }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const eventId = searchParams.get("eventId");

  const segment = pathname?.split("/")[2]; // "/judges/<segment>"
  const category = CATEGORY_BY_SEGMENT[segment];

  return (
    <RequireAuth>
      {children}
      {eventId && category && (
        <JudgeChatWidget eventId={eventId} category={category} />
      )}
    </RequireAuth>
  );
}
