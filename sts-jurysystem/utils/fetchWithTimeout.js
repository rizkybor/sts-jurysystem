// Dipakai submit penalty di semua halaman juri (app/judges/*/page.jsx).
// Tanpa ini, fetch() browser TIDAK PERNAH timeout sendiri — kalau request
// macet (server hang, koneksi hilang tanpa error jelas, dsb), tombol
// submit juri bisa "Submitting..." selamanya tanpa feedback apa pun.
// AbortController di sini memaksa fetch menyerah setelah `timeoutMs`.
//
// Nilai default (20 detik) sengaja LEBIH LAMA dari total budget timeout
// MongoDB di sisi server (connectTimeoutMS+socketTimeoutMS, lihat
// config/database.js, ~15-23 detik) — supaya kalau backend memang
// akhirnya menjawab dgn pesan error yang jelas ("Koneksi ke server
// database timeout..."), client sempat menerimanya duluan sebelum
// AbortController ini menyerah sendiri.
export const PENALTY_SUBMIT_TIMEOUT_MS = 20000;

export async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = PENALTY_SUBMIT_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Pesan konsisten kalau AbortController di atas yang menyerah (bukan
// error jaringan biasa) — juri PERLU tahu penalty BISA SAJA tetap
// tersimpan di server walau client menyerah menunggu (request tidak
// pernah benar-benar dibatalkan di server), jadi jangan asal submit
// ulang tanpa cek. Aman dicoba ulang krn validasi anti-duplikat di
// backend akan menolak kalau ternyata sudah tersimpan — penolakan itu
// justru jadi konfirmasi submit pertama berhasil.
export const TIMEOUT_RETRY_MESSAGE =
  "Koneksi ke server timeout. Penalty BISA SAJA tetap tersimpan — cek Riwayat dulu sebelum submit ulang (submit ulang aman, akan ditolak otomatis kalau ternyata sudah tersimpan).";
