import connectDB from "@/config/database";
import mongoose from "mongoose";
import OrienteeringMatchDetail from "@/components/OrienteeringMatchDetail";

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    if (!mongoose.Types.ObjectId.isValid(String(id || ""))) return { title: "Event Not Found" };
    await connectDB();
    const e = await mongoose.connection.db
      .collection("orienteeringEvents")
      .findOne({ _id: new mongoose.Types.ObjectId(String(id)), liveVisible: { $ne: false } });
    if (!e) return { title: "Event Not Found" };
    const where = [...new Set((e.races || []).map((r) => r.location).filter(Boolean))].join(" · ") || e.location || "";
    const description = `${e.name}${where ? ` — ${where}` : ""}. Detail event Orienteering, jenis lomba, kategori, dan daftar peserta di STiming Scoring.`;
    const img = e.image?.url;
    return {
      title: e.name,
      description,
      openGraph: {
        title: `${e.name} | STiming Scoring`,
        description,
        url: `/matches/orienteering/${id}`,
        type: "website",
        images: img
          ? [{ url: img, width: 1200, height: 630, alt: e.name }]
          : [{ url: "/assets/images/sts-logo-primary.png", width: 259, height: 259, alt: "STiming Scoring" }],
      },
      alternates: { canonical: `/matches/orienteering/${id}` },
    };
  } catch {
    return { title: "Event Detail" };
  }
}

export default function OrienteeringMatchDetailPage() {
  return <OrienteeringMatchDetail />;
}
