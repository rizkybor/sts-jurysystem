// Generate /robots.txt otomatis (konvensi App Router). Sebelumnya tidak
// ada robots.txt sama sekali, jadi halaman privat (/judges, /profile,
// /histories — semuanya di belakang RequireAuth) tidak pernah secara
// eksplisit dilarang di-crawl, walau root layout.jsx men-set
// `robots: { index: true, follow: true }` secara global. Karena halaman
// itu client component, tidak bisa override metadata per-halaman —
// robots.txt di level ini yang jadi satu-satunya cara melarangnya.
export default function robots() {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/judges", "/judges/", "/profile", "/histories", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
