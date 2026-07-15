import LegalPageLayout, { LegalSection } from "@/components/LegalPageLayout";

export const metadata = {
  title: "Syarat & Ketentuan",
  description: "Syarat dan ketentuan penggunaan STiming Scoring.",
};

export default function TermsPage() {
  return (
    <LegalPageLayout title="Syarat & Ketentuan" updatedAt="15 Juli 2026">
      <LegalSection>
        <p>
          Dengan mengakses dan menggunakan STiming Scoring
          (&quot;STS&quot;, &quot;Layanan&quot;, &quot;kami&quot;), Anda
          menyetujui syarat dan ketentuan berikut. Jika Anda tidak menyetujui
          salah satu ketentuan di bawah ini, mohon untuk tidak menggunakan
          Layanan.
        </p>
      </LegalSection>

      <LegalSection heading="1. Penggunaan Layanan">
        <p>
          STS disediakan untuk mendukung proses timing, penjurian, dan
          publikasi hasil event Whitewater Rafting Championship. Anda setuju
          menggunakan Layanan hanya untuk tujuan yang sah dan sesuai dengan
          perannya (penyelenggara, juri, operator timing, peserta, atau
          pengunjung publik).
        </p>
      </LegalSection>

      <LegalSection heading="2. Akun & Autentikasi">
        <p>
          Akses ke halaman juri (<code>/judges</code>) dan halaman pribadi
          (<code>/profile</code>, <code>/histories</code>) memerlukan login
          menggunakan akun Google. Anda bertanggung jawab menjaga kerahasiaan
          akses akun Anda dan segala aktivitas yang terjadi melalui akun
          tersebut.
        </p>
      </LegalSection>

      <LegalSection heading="3. Konten Pengguna">
        <p>
          Fitur live chat memungkinkan pengiriman pesan teks, gambar, dan
          pesan suara antara juri dan operator timing. Anda bertanggung jawab
          atas konten yang Anda kirimkan dan setuju untuk tidak mengirimkan
          konten yang melanggar hukum, mengandung ujaran kebencian, atau
          mengganggu jalannya pertandingan.
        </p>
      </LegalSection>

      <LegalSection heading="4. Akurasi Data">
        <p>
          Kami berupaya menjaga keakuratan data hasil pertandingan dan
          timing, namun hasil resmi tetap mengacu pada keputusan panitia dan
          juri di lapangan. Data yang ditampilkan pada halaman Live Result
          bersifat informatif dan dapat berubah sewaktu-waktu mengikuti
          perkembangan pertandingan.
        </p>
      </LegalSection>

      <LegalSection heading="5. Pembatasan Tanggung Jawab">
        <p>
          STS disediakan &quot;sebagaimana adanya&quot;. Kami tidak
          bertanggung jawab atas kerugian yang timbul akibat gangguan
          teknis, kesalahan input data oleh pengguna, atau ketidaktersediaan
          layanan di luar kendali kami.
        </p>
      </LegalSection>

      <LegalSection heading="6. Perubahan Ketentuan">
        <p>
          Kami dapat memperbarui syarat dan ketentuan ini dari waktu ke
          waktu. Perubahan akan berlaku sejak dipublikasikan pada halaman
          ini.
        </p>
      </LegalSection>

      <LegalSection heading="7. Kontak">
        <p>
          Pertanyaan terkait syarat dan ketentuan ini dapat disampaikan
          melalui{" "}
          <a
            href="https://jcdigital.co.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sts font-medium hover:underline"
          >
            PT. Jendela Cakra Digital
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
