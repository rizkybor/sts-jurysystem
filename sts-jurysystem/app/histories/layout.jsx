"use client";

import RequireAuth from "@/components/RequireAuth";

export default function HistoriesLayout({ children }) {
  return <RequireAuth>{children}</RequireAuth>;
}
