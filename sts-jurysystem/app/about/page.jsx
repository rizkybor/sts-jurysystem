import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Tentang Kami",
  description:
    "Tentang STiming Scoring (STS) — platform timing dan penjurian untuk event arung jeram/whitewater rafting.",
  openGraph: {
    title: "Tentang Kami | STiming Scoring",
    description:
      "Tentang STiming Scoring (STS) — platform timing dan penjurian untuk event arung jeram/whitewater rafting.",
    url: "/about",
    type: "website",
    images: [
      {
        url: "/assets/images/sts-logo-primary.png",
        width: 259,
        height: 259,
        alt: "STiming Scoring",
      },
    ],
  },
  alternates: {
    canonical: "/about",
  },
};

const PRODUCTS = [
  {
    title: "Aplikasi Juri",
    platform: "Web · Tablet & Mobile",
    description:
      "Tempat juri mencatat penilaian tiap kategori lomba — Sprint, Slalom, Head to Head, Down River Race, dan Rafting Cross — langsung dari lapangan secara realtime.",
  },
  {
    title: "Aplikasi Timing",
    platform: "Desktop",
    description:
      "Dioperasikan oleh tim operator untuk mengelola data peserta, waktu, dan hasil pertandingan secara resmi selama event berlangsung.",
  },
  {
    title: "Live Result & Halaman Publik",
    platform: "Web",
    description:
      "Tempat penonton dan peserta memantau hasil pertandingan secara live, termasuk skor, peringkat, dan detail event.",
  },
];

const VALUES = [
  {
    title: "Akurat",
    description:
      "Setiap penilaian dan catatan waktu diverifikasi melalui alur kerja yang konsisten antara juri dan operator, meminimalkan kesalahan input.",
  },
  {
    title: "Real-time",
    description:
      "Hasil pertandingan tersinkronisasi secara langsung dari lapangan ke sistem publik, tanpa jeda proses manual.",
  },
  {
    title: "Transparan",
    description:
      "Status hasil resmi (official/unofficial) ditampilkan jelas per kategori, sehingga peserta dan penonton tahu persis validitas data yang mereka lihat.",
  },
];

export default function AboutPage() {
  return (
    <section className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sts via-stsDark to-stsDarkHiglight py-14 sm:py-20">
        <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-stsHighlight/25 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-80 h-80 rounded-full bg-cyan-400/15 blur-[110px]" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/95 ring-1 ring-white/40 shadow-lg shadow-black/10 flex items-center justify-center p-3">
              <Image
                src="/assets/images/sts-logo-primary.png"
                alt="STiming Scoring"
                width={259}
                height={259}
                className="w-full h-full object-contain"
                priority
              />
            </div>

            <div>
              <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-white/70 bg-white/10 ring-1 ring-white/20 rounded-full px-3 py-1">
                Tentang Kami
              </span>
              <h1 className="mt-3 text-2xl sm:text-4xl font-bold text-white tracking-tight">
                STiming Scoring
              </h1>
              <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-white/85 leading-relaxed">
                Platform digital untuk mengelola timing, penjurian, dan hasil
                pertandingan pada event Whitewater Rafting Championship —
                akurat, transparan, dan dapat diakses secara real-time.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10 sm:space-y-14">
        {/* Ekosistem produk */}
        <div>
          <div className="mb-5 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
              Ekosistem Kami
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-gray-600">
              Tiga aplikasi yang saling terhubung untuk mendukung
              penyelenggaraan event dari lapangan hingga ke penonton.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {PRODUCTS.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl ring-1 ring-gray-200/70 shadow-sm p-5 sm:p-6 flex flex-col gap-2.5 hover:ring-sts/30 hover:shadow-md transition"
              >
                <span className="inline-block w-fit text-[10px] font-bold uppercase tracking-wider text-sts bg-sts/10 rounded-full px-2.5 py-1">
                  {item.platform}
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Komitmen / Nilai */}
        <div>
          <div className="mb-5 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
              Komitmen Kami
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-gray-600">
              Kami terus mengembangkan sistem ini berdasarkan kebutuhan nyata
              di lapangan bersama para operator dan juri.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {VALUES.map((item, idx) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl ring-1 ring-gray-200/70 shadow-sm p-5 sm:p-6"
              >
                <div className="w-9 h-9 rounded-xl bg-sts/10 text-sts font-bold flex items-center justify-center text-sm mb-3">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Kontak / CTA */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sts via-stsDark to-stsDarkHiglight p-6 sm:p-10 text-center">
          <div className="pointer-events-none absolute -bottom-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-[80px]" />
          <div className="relative">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Dikembangkan oleh PT. Jendela Cakra Digital
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-sm text-white/85 leading-relaxed">
              Untuk pertanyaan, kerja sama, atau dukungan teknis terkait
              platform ini, silakan hubungi tim kami melalui website resmi.
            </p>
            <Link
              href="https://jcdigital.co.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white text-sts font-semibold text-sm px-5 py-2.5 hover:bg-white/90 transition"
            >
              Kunjungi jcdigital.co.id
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
