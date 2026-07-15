import LegalPageLayout, { LegalSection } from "@/components/LegalPageLayout";

export const metadata = {
  title: "Tentang Kami",
  description:
    "Tentang STiming Scoring (STS) — platform timing dan penjurian untuk event arung jeram/whitewater rafting.",
};

export default function AboutPage() {
  return (
    <LegalPageLayout title="Tentang Kami">
      <LegalSection>
        <p>
          <strong>STiming Scoring (STS)</strong> adalah platform
          digital untuk mengelola timing, penjurian, dan hasil pertandingan
          pada event Whitewater Rafting Championship. STS dikembangkan untuk
          membantu penyelenggara event, juri, dan peserta mendapatkan proses
          pencatatan waktu serta penilaian yang akurat, transparan, dan dapat
          diakses secara real-time.
        </p>
      </LegalSection>

      <LegalSection heading="Apa yang Kami Kerjakan">
        <p>
          Ekosistem STS terdiri dari beberapa aplikasi yang saling terhubung:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Aplikasi Juri (web)</strong> — tempat juri mencatat
            penilaian tiap kategori lomba (Sprint, Slalom, Head to Head, Down
            River Race, Rafting Cross) langsung dari lapangan.
          </li>
          <li>
            <strong>Aplikasi Timing (desktop)</strong> — dioperasikan oleh
            tim operator untuk mengelola data peserta, waktu, dan hasil
            pertandingan secara resmi.
          </li>
          <li>
            <strong>Live Result &amp; Halaman Publik</strong> — tempat
            penonton dan peserta memantau hasil pertandingan secara live,
            termasuk skor, peringkat, dan detail event.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Komitmen Kami">
        <p>
          Kami berkomitmen menjaga keakuratan data pertandingan, kecepatan
          distribusi hasil, serta keamanan data pengguna yang menggunakan
          platform ini. Sistem terus kami kembangkan berdasarkan kebutuhan
          nyata di lapangan bersama para operator dan juri.
        </p>
      </LegalSection>

      <LegalSection heading="Kontak">
        <p>
          STiming Scoring dikembangkan oleh{" "}
          <a
            href="https://jcdigital.co.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sts font-medium hover:underline"
          >
            PT. Jendela Cakra Digital
          </a>
          . Untuk pertanyaan, kerja sama, atau dukungan teknis terkait
          platform ini, silakan hubungi tim kami melalui website resmi di
          atas.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
