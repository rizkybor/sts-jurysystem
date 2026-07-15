import LegalPageLayout, { LegalSection } from "@/components/LegalPageLayout";

export const metadata = {
  title: "Kebijakan Cookie",
  description: "Kebijakan penggunaan cookie pada STiming Scoring.",
};

export default function CookiesPage() {
  return (
    <LegalPageLayout title="Kebijakan Cookie" updatedAt="15 Juli 2026">
      <LegalSection>
        <p>
          Halaman ini menjelaskan bagaimana STiming Scoring
          (&quot;STS&quot;) menggunakan cookie dan teknologi penyimpanan
          serupa saat Anda mengakses Layanan kami.
        </p>
      </LegalSection>

      <LegalSection heading="1. Apa itu Cookie">
        <p>
          Cookie adalah berkas data kecil yang disimpan di perangkat Anda
          oleh browser saat mengunjungi sebuah website. Cookie membantu
          website mengingat informasi tentang kunjungan Anda, seperti status
          login.
        </p>
      </LegalSection>

      <LegalSection heading="2. Cookie yang Kami Gunakan">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Cookie sesi (esensial)</strong> — digunakan oleh sistem
            autentikasi (NextAuth) untuk menjaga status login Anda tetap
            aktif selama menggunakan Layanan, khususnya pada halaman juri,
            profil, dan riwayat.
          </li>
          <li>
            <strong>Preferensi lokal</strong> — beberapa pengaturan tampilan
            (misalnya status perbesar/perkecil panel chat) disimpan di
            penyimpanan lokal browser Anda agar preferensi tetap tersimpan
            di perangkat yang sama.
          </li>
        </ul>
        <p>
          Kami tidak menggunakan cookie pihak ketiga untuk keperluan iklan
          atau pelacakan lintas situs.
        </p>
      </LegalSection>

      <LegalSection heading="3. Mengelola Cookie">
        <p>
          Sebagian besar cookie yang kami gunakan bersifat esensial agar
          fitur login dan halaman terproteksi (juri, profil, riwayat) dapat
          berfungsi dengan baik. Menonaktifkan cookie melalui pengaturan
          browser Anda dapat menyebabkan Anda tidak dapat login atau
          mengakses halaman-halaman tersebut.
        </p>
      </LegalSection>

      <LegalSection heading="4. Perubahan Kebijakan">
        <p>
          Kebijakan Cookie ini dapat diperbarui dari waktu ke waktu mengikuti
          perkembangan Layanan kami.
        </p>
      </LegalSection>

      <LegalSection heading="5. Kontak">
        <p>
          Pertanyaan terkait penggunaan cookie dapat disampaikan melalui{" "}
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
