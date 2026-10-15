import LegalPageLayout, { LegalSection } from "@/components/LegalPageLayout";

export const metadata = {
  title: "Syarat & Ketentuan",
  description: "Syarat dan ketentuan penggunaan STiming Scoring untuk event Whitewater Rafting dan Orienteering.",
};

// Penanda bagian besar (Ketentuan Umum / A. Rafting / B. Orienteering)
function PartHeading({ label, title, description, tone = "sts" }) {
  const tones = {
    sts: "from-sts/10 to-sts/5 ring-sts/20 text-stsDark",
    rafting: "from-sky-50 to-blue-50 ring-sky-200 text-sky-900",
    orienteering: "from-emerald-50 to-teal-50 ring-emerald-200 text-emerald-900",
  };
  return (
    <div className={`rounded-xl bg-gradient-to-r ring-1 px-4 py-3 sm:px-5 sm:py-4 ${tones[tone]}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-lg sm:text-xl font-bold">{title}</div>
      {description && <p className="mt-0.5 text-sm opacity-80">{description}</p>}
    </div>
  );
}

export default function TermsPage() {
  return (
    <LegalPageLayout title="Syarat & Ketentuan" updatedAt="15 Oktober 2026">
      <LegalSection>
        <p>
          Dengan mengakses dan menggunakan STiming Scoring
          (&quot;STS&quot;, &quot;Layanan&quot;, &quot;kami&quot;), Anda
          menyetujui syarat dan ketentuan berikut. Ketentuan ini terdiri dari
          <strong> Ketentuan Umum</strong> yang berlaku untuk seluruh Layanan,
          serta ketentuan khusus untuk <strong>A. Whitewater Rafting</strong>{" "}
          dan <strong>B. Orienteering</strong>. Jika Anda tidak menyetujui
          salah satu ketentuan di bawah ini, mohon untuk tidak menggunakan
          Layanan.
        </p>
      </LegalSection>

      {/* ============================ KETENTUAN UMUM ============================ */}
      <PartHeading label="Berlaku untuk semua" title="Ketentuan Umum" />

      <LegalSection heading="1. Penggunaan Layanan">
        <p>
          STS disediakan untuk mendukung proses timing, penjurian, dan
          publikasi hasil event Whitewater Rafting dan Orienteering. Anda
          setuju menggunakan Layanan hanya untuk tujuan yang sah dan sesuai
          dengan peran Anda (penyelenggara, juri, operator timing, peserta,
          atau pengunjung publik).
        </p>
      </LegalSection>

      <LegalSection heading="2. Akun & Autentikasi">
        <p>
          Akses ke halaman juri (<code>/judges</code>) dan halaman pribadi
          (<code>/profile</code>, <code>/histories</code>) memerlukan login
          menggunakan akun Google. Anda bertanggung jawab menjaga kerahasiaan
          akses akun Anda dan segala aktivitas yang terjadi melalui akun
          tersebut. Halaman publik (Events, Live Result, dan detail event)
          dapat diakses tanpa login.
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

      <LegalSection heading="4. Hasil Resmi & Akurasi Data">
        <p>
          Kami berupaya menjaga keakuratan data hasil pertandingan dan
          timing, namun hasil resmi tetap mengacu pada keputusan panitia
          penyelenggara (dan juri, untuk cabang yang menggunakan juri). Data
          yang ditampilkan pada halaman Live Result bersifat informatif dan
          dapat berubah sewaktu-waktu mengikuti perkembangan pertandingan.
          Ketentuan khusus tiap cabang diatur pada bagian A dan B di bawah.
        </p>
      </LegalSection>

      <LegalSection heading="5. Pembatasan Tanggung Jawab">
        <p>
          STS disediakan &quot;sebagaimana adanya&quot;. Kami tidak
          bertanggung jawab atas kerugian yang timbul akibat gangguan
          teknis, gangguan jaringan, kerusakan perangkat timing, kesalahan
          input data oleh pengguna, atau ketidaktersediaan layanan di luar
          kendali kami.
        </p>
      </LegalSection>

      {/* ============================ A. RAFTING ============================ */}
      <PartHeading
        tone="rafting"
        label="Bagian A"
        title="Ketentuan Khusus Whitewater Rafting"
        description="Kategori Sprint, Slalom, Head to Head, Down River Race, dan Rafting Cross."
      />

      <LegalSection heading="A.1 Penjurian">
        <p>
          Penilaian dan penalti pada event Whitewater Rafting dicatat oleh
          juri yang ditugaskan panitia melalui aplikasi juri STS. Juri hanya
          dapat menilai kategori dan bagian (mis. gate atau section) yang
          ditugaskan kepadanya, dan bertanggung jawab atas kebenaran setiap
          penilaian yang dikirimkan.
        </p>
      </LegalSection>

      <LegalSection heading="A.2 Timing & Penalti">
        <p>
          Waktu start dan finish dicatat oleh operator timing melalui
          aplikasi timing STS, termasuk dari perangkat timing yang
          terhubung. Penalti dari juri dikirim secara realtime dan
          diperhitungkan ke dalam hasil oleh sistem; apabila koneksi
          terputus, penalti yang tertunda akan disinkronkan kembali saat
          koneksi pulih.
        </p>
      </LegalSection>

      <LegalSection heading="A.3 Status Hasil">
        <p>
          Hasil tiap kategori ditampilkan dengan status{" "}
          <strong>Provisional</strong>, <strong>Unofficial</strong>, atau{" "}
          <strong>Official</strong> yang ditetapkan oleh operator/panitia
          (untuk Head to Head, status ditetapkan per babak). Hanya hasil
          berstatus <strong>Official</strong> yang dianggap final; hasil
          dengan status lain masih dapat berubah, termasuk akibat protes
          atau keputusan juri.
        </p>
      </LegalSection>

      {/* ============================ B. ORIENTEERING ============================ */}
      <PartHeading
        tone="orienteering"
        label="Bagian B"
        title="Ketentuan Khusus Orienteering"
        description="Jenis lomba seperti Sprint Distance dan Middle Distance, untuk Type Event National maupun World Ranking."
      />

      <LegalSection heading="B.1 Tanpa Juri">
        <p>
          Event Orienteering <strong>tidak menggunakan juri</strong> dan
          aplikasi juri STS. Seluruh hasil dihitung oleh aplikasi timing STS
          dan dikelola oleh operator timing yang ditunjuk panitia.
        </p>
      </LegalSection>

      <LegalSection heading="B.2 Perhitungan Waktu dari SI Card">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Waktu dihitung <strong>hanya</strong> dari data SI Card: punch
            Finish dikurangi punch Start. Jadwal start (Starting Order)
            bersifat informasi dan <strong>tidak</strong> dipakai menghitung
            waktu.
          </li>
          <li>
            Kartu tanpa punch Start berstatus <strong>No Start</strong>,
            tanpa punch Finish berstatus <strong>DNF</strong>, dan pos yang
            terlewat atau salah urutan (format Classic) berstatus{" "}
            <strong>MP</strong> (Missing Punch). Peserta dengan status
            tersebut tidak mendapat peringkat.
          </li>
          <li>
            Peserta yang kartunya belum dibaca ditampilkan sebagai belum
            mulai (<em>not started</em>), dan jadwal start yang ditampilkan
            hanya berupa informasi Starting Order.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="B.3 Koreksi Hasil oleh Operator">
        <p>
          Operator timing dapat mengoreksi hasil (mis. waktu start/finish,
          jam punch pos dari unit cadangan, pos yang dianggap dipunch karena
          unit pos rusak, penalti waktu, atau status) dengan menyertakan
          alasan. Data asli SI Card tidak diubah; hasil yang dikoreksi
          ditandai sebagai <strong>&quot;Edited&quot;</strong> pada halaman
          hasil, dan peringkat dihitung ulang secara otomatis. Keputusan
          akhir atas setiap koreksi berada pada panitia penyelenggara.
        </p>
      </LegalSection>

      <LegalSection heading="B.4 Data Peserta & Publikasi">
        <p>
          Data peserta (start list) diinput atau diimpor oleh panitia.
          Halaman publik hanya menampilkan nama, kategori, klub, negara,
          BIB, jadwal start, waktu dan split per pos, serta status hasil;
          nomor SI Card dan IOF ID tidak ditampilkan. Panitia dapat
          menampilkan atau menyembunyikan suatu event Orienteering dari Live
          Result kapan saja. Rincian pengelolaan data diatur dalam{" "}
          <a href="/privacy" className="text-sts font-medium hover:underline">
            Kebijakan Privasi
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="B.5 Perangkat Timing">
        <p>
          STS adalah sistem timing <strong>tidak resmi</strong> (
          <em>Unofficial</em> Microgate &amp; SPORTident Timing System) dan
          tidak berafiliasi dengan, disponsori, atau didukung oleh Microgate
          S.r.l. maupun SPORTident GmbH. Keakuratan hasil bergantung pada
          kondisi dan konfigurasi perangkat SI Card/SI Reader yang digunakan
          panitia.
        </p>
      </LegalSection>

      {/* ============================ PENUTUP ============================ */}
      <PartHeading label="Penutup" title="Perubahan & Kontak" />

      <LegalSection heading="Perubahan Ketentuan">
        <p>
          Kami dapat memperbarui syarat dan ketentuan ini dari waktu ke
          waktu. Perubahan akan berlaku sejak dipublikasikan pada halaman
          ini.
        </p>
      </LegalSection>

      <LegalSection heading="Kontak">
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
