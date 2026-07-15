"use client";

import RequireAuth from "@/components/RequireAuth";

export default function ProfileLayout({ children }) {
  return <RequireAuth>{children}</RequireAuth>;
}
