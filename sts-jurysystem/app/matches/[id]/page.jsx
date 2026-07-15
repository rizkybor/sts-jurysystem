import connectDB from "@/config/database";
import Event from "@/models/Event";
import MatchDetail from "@/components/MatchDetail";

function fmtLocation(event) {
  return [event.addressCity, event.addressProvince].filter(Boolean).join(", ");
}

export async function generateMetadata({ params }) {
  const { id } = await params;

  try {
    await connectDB();
    const event = await Event.findById(id).lean();
    if (!event) {
      return { title: "Event Not Found" };
    }

    const location = fmtLocation(event);
    const description = `${event.eventName}${
      location ? ` — ${location}` : ""
    }${event.levelName ? ` (${event.levelName})` : ""}. Lihat detail, jadwal, dan hasil pertandingan Whitewater Rafting Championship di STiming Scoring.`;

    const posterUrl = event.poster_url || event.posterUrl || event.imageUrl;

    return {
      title: event.eventName,
      description,
      openGraph: {
        title: `${event.eventName} | STiming Scoring`,
        description,
        url: `/matches/${id}`,
        type: "website",
        images: posterUrl
          ? [{ url: posterUrl, width: 1200, height: 630, alt: event.eventName }]
          : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: event.eventName,
        description,
        images: posterUrl ? [posterUrl] : undefined,
      },
      alternates: {
        canonical: `/matches/${id}`,
      },
    };
  } catch {
    return { title: "Event Detail" };
  }
}

export default function MatchDetailPage() {
  return <MatchDetail />;
}
