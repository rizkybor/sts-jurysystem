⸻

STS-JURYSYSTEM

Sistem penjurian untuk cabang balap (Sprint, Slalom, Head-to-Head, Down River Race) berbasis Next.js, MongoDB, dan API modular. Mendukung pencatatan penalti, laporan juri, serta konfigurasi zona waktu dinamis.

Runtime minimum: Node 16.20.2
Stack ringkas: Next.js (App Router), Mongoose, TailwindCSS

⸻

Fitur Utama
	•	Manajemen Tim & Hasil
	•	Penyimpanan tim per event/divisi/race.
	•	Hasil multi-run (mis. Slalom: start/finish/gate penalty, akumulasi total).
	•	Laporan Juri
	•	Mode langsung ke detail laporan atau dari agregasi JudgeReport.
	•	Filter lengkap: event, tipe lomba, tim, juri, rentang tanggal, pagination, sorting.
	•	Time Zone Dinamis
	•	Simpan timestamp dalam UTC, tampilkan sesuai APP_TIMEZONE.
	•	Override per request via query ?tz= atau header x-timezone.
	•	Arsitektur Modular
	•	App Router Next.js di app/
	•	Model Mongoose di models/
	•	Helper utilitas di utils/
	•	Konfigurasi DB di config/

⸻

Prasyarat
	•	Node.js 16.20.2
	•	Disarankan menggunakan nvm:

nvm install 16.20.2
nvm use 16.20.2


	•	MongoDB (lokal atau layanan hosted)
	•	Yarn atau npm

⸻

Instalasi

# clone repo
git clone <repo-url> sts-jurysystem
cd sts-jurysystem

# install dependency
yarn        # atau: npm install

Buat file .env di root proyek:

# koneksi database
MONGODB_URI=mongodb://localhost:27017/sts_jurysystem

# zona waktu default aplikasi (IANA time zone)
APP_TIMEZONE=Asia/Jakarta

# opsi lain (sesuaikan kebutuhan proyek)
# SESSION_SECRET=ubah_ini
# NEXT_PUBLIC_BASE_URL=http://localhost:3000


⸻

Menjalankan

# development
yarn dev     # atau: npm run dev

# production
yarn build   # atau: npm run build
yarn start   # atau: npm start

Default: http://localhost:3000

⸻

Struktur Proyek

sts-jurysystem/
├─ app/
│  ├─ api/                # route API (Next.js App Router)
│  ├─ judges/ live/ ...   # halaman/fitur
│  ├─ layout.jsx
│  └─ page.jsx
├─ components/            # komponen UI
├─ config/
│  └─ database.js         # connectDB (mongoose)
├─ context/               # context provider (jika ada)
├─ models/                # schema Mongoose (TeamsRegistered, JudgeReport, dsb.)
├─ public/                # aset publik
├─ utils/
│  └─ timezone.js         # helper TZ dinamis (APP_TIMEZONE, ?tz=, x-timezone)
├─ next.config.mjs
├─ tailwind.config.mjs
├─ postcss.config.mjs
├─ middleware.js
├─ package.json
└─ README.md


⸻

Konsep Time Zone
	•	Semua timestamp disimpan UTC di database.
	•	Utilitas utils/timezone.js menyediakan:
	•	getTimeZoneFromRequest(req) → prioritas: ?tz=, x-timezone, APP_TIMEZONE, default.
	•	formatDateByZone(date, tz) → render string lokal.
	•	buildCreatedAtMeta(reqOrTz) → menghasilkan:
	•	createdAt (Date UTC),
	•	createdAtLocal (string lokal),
	•	createdAtTz (label TZ).

Contoh pemakaian di POST:

import { buildCreatedAtMeta, getTimeZoneFromRequest } from "@/utils/timezone";

export const POST = async (req) => {
  const tz = getTimeZoneFromRequest(req);
  const stamp = buildCreatedAtMeta(tz);

  // simpan ke model detail
  await JudgeReportDetail.create({
    ...payload,
    createdAt: stamp.createdAt,           // UTC
    createdAtLocal: stamp.createdAtLocal, // opsional, string lokal
    createdAtTz: stamp.createdAtTz,       // opsional, jejak TZ
  });

  // ...
};

Override TZ per request:
	•	Query: GET /api/...?...&tz=Asia/Makassar
	•	Header: x-timezone: Asia/Jayapura

Shortlist TZ untuk dokumentasi tersedia di docs/timezones.md (opsional).

⸻

API Ringkas

Contoh, sesuaikan path aktual app/api/....

Ambil daftar tim terdaftar (per event)

GET /api/matches/:eventId?initialId=...&divisionId=...&raceId=...&eventName=...&tz=Asia/Jakarta

Respons:

{
  "success": true,
  "timeZone": "Asia/Jakarta",
  "teams": [
    {
      "_id": "team-uuid",
      "nameTeam": "Falcon A",
      "bibTeam": "A12",
      "eventId": "68f0...",
      "initialId": "1",
      "divisionId": "1",
      "raceId": "1",
      "eventName": "SLALOM",
      "results": [ /* array hasil run, tanggal sudah dipetakan */ ]
    }
  ]
}

Laporan juri: ambil detail

GET /api/judge-report-detail?eventId=...&eventType=SLALOM&team=...&mine=true&createdFrom=...&createdTo=...&page=1&limit=50&sortBy=createdAt&sort=desc

	•	Mode fromReport (ambil dari daftar ID yang disimpan di JudgeReport):

GET ...&fromReport=true



Laporan juri: simpan (POST)

POST /api/judge-report-detail
Content-Type: application/json
x-timezone: Asia/Jakarta

{
  "eventType": "SPRINT",
  "eventId": "68f0cbb10285e03294c39d99",
  "team": "68f0d3b1f201613f4f51f694",
  "position": "Start",
  "penalty": 0,
  "divisionId": "1",
  "raceId": "1",
  "remarks": "OK"
}

Respons:

{
  "success": true,
  "message": "Sprint Start penalty recorded - 0s",
  "timeZone": "Asia/Jakarta",
  "data": {
    "_id": "...",
    "createdAt": "2025-10-28T15:41:12.084Z",
    "createdAtLocal": "28/10/2025 22.41.12",
    "createdAtTz": "Asia/Jakarta"
  }
}


⸻

Pengembangan
	•	Lint/format: sesuaikan dengan config proyek (ESLint/Prettier jika tersedia).
	•	Testing: tambahkan test untuk util TZ dan flow POST/GET penting.
	•	Seed data: buat script seed jika diperlukan untuk simulasi event dan tim.

⸻

Keamanan & Praktik Baik
	•	Simpan rahasia di .env dan jangan commit.
	•	Selalu validasi eventType, team, penalty, dsb.
	•	Rate limit endpoint POST jika dipakai di lapangan.
	•	Log kesalahan di server, jangan bocorkan stack trace ke klien.

⸻

Troubleshooting Cepat
	•	Zona waktu tidak sesuai tampilan
	•	Cek APP_TIMEZONE, atau kirim ?tz=/x-timezone.
	•	Pastikan format IANA valid (mis. Asia/Jakarta), bukan WIB.
	•	Dokumen tim tidak ter-update
	•	Periksa filter findOneAndUpdate: eventId, eventName, dan "teams.teamId" harus tepat.
	•	Cek struktur result sesuai run index (Slalom).
	•	Validasi SPRINT duplikat
	•	Server menolak jika tim sudah punya Start dan Finish, atau posisi yang sama sudah tercatat.

⸻

Lisensi

MIT (atau sesuai kebutuhan organisasi).

⸻

Kredit

Tim pengembang STS-JURYSYSTEM. Terima kasih pada semua juri yang tetap waras menghitung penalti di tengah kebisingan lapangan.