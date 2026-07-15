import LegalPageLayout, { LegalSection } from "@/components/LegalPageLayout";

export const metadata = {
  title: "Kebijakan Privasi",
  description: "Kebijakan privasi STiming Scoring.",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Kebijakan Privasi" updatedAt="15 Juli 2026">
      <LegalSection>
        <p>
          Kebijakan Privasi ini menjelaskan bagaimana STiming Scoring
          (&quot;STS&quot;, &quot;kami&quot;) mengumpulkan,
          menggunakan, dan melindungi data Anda saat menggunakan Layanan
          kami.
        </p>
      </LegalSection>

      <LegalSection heading="1. Data yang Kami Kumpulkan">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Data akun</strong> — nama, alamat email, dan foto profil
            yang diperoleh saat Anda login menggunakan akun Google.
          </li>
          <li>
            <strong>Data penjurian</strong> — penilaian, catatan waktu, dan
            hasil yang Anda input sebagai juri untuk suatu event.
          </li>
          <li>
            <strong>Konten live chat</strong> — pesan teks, gambar, dan pesan
            suara yang Anda kirimkan melalui fitur chat, tersimpan untuk
            keperluan riwayat komunikasi selama event berlangsung.
          </li>
          <li>
            <strong>Data teknis</strong> — informasi perangkat dan aktivitas
            penggunaan yang wajar untuk menjaga keamanan dan performa
            Layanan.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. Penggunaan Data">
        <p>Data yang kami kumpulkan digunakan untuk:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Mengautentikasi dan mengelola akses akun juri.</li>
          <li>
            Memproses dan menampilkan hasil pertandingan secara akurat dan
            real-time.
          </li>
          <li>
            Mendukung komunikasi antara juri dan operator timing selama
            event berlangsung.
          </li>
          <li>Meningkatkan kualitas dan keandalan Layanan.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Penyimpanan Data">
        <p>
          Data disimpan pada basis data terkelola (MongoDB Atlas) dengan
          akses terbatas. Berkas gambar dan pesan suara pada fitur live chat
          disimpan melalui layanan pihak ketiga (Cloudinary) yang kami
          kelola khusus untuk kebutuhan aplikasi ini.
        </p>
      </LegalSection>

      <LegalSection heading="4. Berbagi Data">
        <p>
          Kami tidak menjual atau menyewakan data pribadi Anda kepada pihak
          ketiga. Data hasil pertandingan yang bersifat publik (mis. nama
          peserta, skor, peringkat) dapat ditampilkan pada halaman Live
          Result sebagai bagian dari layanan publikasi hasil event.
        </p>
      </LegalSection>

      <LegalSection heading="5. Hak Anda">
        <p>
          Anda berhak meminta akses, koreksi, atau penghapusan data akun
          Anda. Anda juga dapat menghapus pesan yang Anda kirim sendiri
          melalui fitur live chat kapan saja.
        </p>
      </LegalSection>

      <LegalSection heading="6. Keamanan">
        <p>
          Kami menerapkan langkah-langkah teknis yang wajar untuk melindungi
          data Anda dari akses, perubahan, atau pengungkapan yang tidak sah.
          Meski demikian, tidak ada sistem yang sepenuhnya bebas risiko, dan
          kami mendorong Anda untuk menjaga kerahasiaan akses akun Anda.
        </p>
      </LegalSection>

      <LegalSection heading="7. Perubahan Kebijakan">
        <p>
          Kebijakan Privasi ini dapat diperbarui dari waktu ke waktu.
          Perubahan signifikan akan diinformasikan melalui halaman ini.
        </p>
      </LegalSection>

      <LegalSection heading="8. Kontak">
        <p>
          Pertanyaan terkait privasi dapat disampaikan melalui{" "}
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
