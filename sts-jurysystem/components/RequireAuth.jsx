"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// Jaring pengaman client-side: kalau sesi ternyata tidak valid lagi selagi
// user masih berada di halaman terproteksi (mis. logout di tab lain, atau
// sesi expired), langsung lempar ke homepage. Middleware sudah menangani
// akses awal yang belum login; ini menangani kasus sesi mati di tengah jalan.
export default function RequireAuth({ children }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status !== "authenticated") return null;

  return children;
}
