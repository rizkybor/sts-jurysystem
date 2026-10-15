import OrienteeringLiveDetail from "@/components/OrienteeringLiveDetail";

export const metadata = {
  title: "Live Result Orienteering",
  description: "Hasil live Orienteering — peringkat per kategori, diperbarui otomatis setiap kartu SI dibaca.",
};

export default function OrienteeringLivePage() {
  return <OrienteeringLiveDetail />;
}
