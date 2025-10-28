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

Lisensi

MIT (atau sesuai kebutuhan organisasi).

⸻

Kredit

Tim pengembang STS-JURYSYSTEM. Terima kasih pada semua juri yang tetap waras menghitung penalti di tengah kebisingan lapangan.