import LiveEventsBrowser from "@/components/LiveEventsBrowser";

export const metadata = {
  title: "Live Results",
  description:
    "Pantau hasil pertandingan Whitewater Rafting Championship secara real-time. Lihat event yang sedang berlangsung, skor, dan peringkat terkini.",
  openGraph: {
    title: "Live Results | STiming Scoring",
    description:
      "Pantau hasil pertandingan Whitewater Rafting Championship secara real-time — skor dan peringkat terkini.",
    url: "/live",
    type: "website",
  },
  alternates: {
    canonical: "/live",
  },
};

export default function LivePage() {
  return <LiveEventsBrowser />;
}
