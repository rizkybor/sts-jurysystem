import connectDB from "@/config/database";
import Event from "@/models/Event";
import LiveEventDetail from "@/components/LiveEventDetail";

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
    const title = `Live: ${event.eventName}`;
    const description = `Hasil live ${event.eventName}${
      location ? ` di ${location}` : ""
    } — skor dan peringkat terkini, diperbarui secara real-time.`;

    const posterUrl = event.poster_url || event.posterUrl || event.imageUrl;

    return {
      title,
      description,
      openGraph: {
        title: `${title} | STiming Scoring`,
        description,
        url: `/live/${id}`,
        type: "website",
        images: posterUrl
          ? [{ url: posterUrl, width: 1200, height: 630, alt: event.eventName }]
          : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: posterUrl ? [posterUrl] : undefined,
      },
      alternates: {
        canonical: `/live/${id}`,
      },
    };
  } catch {
    return { title: "Live Event" };
  }
}

export default function LiveEventDetailPage() {
  return <LiveEventDetail />;
}
