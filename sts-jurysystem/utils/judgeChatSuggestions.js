// Saran pesan (suggest messages) di Live Chat juri (JudgeChatWidget.jsx).
//
// Tujuannya: kalau "Kirim ke Operator" gagal karena koneksi (timeout /
// network error / server error), juri bisa melaporkan hasil task-nya ke
// operator timing lewat chat dengan cepat — tanpa mengetik ulang semuanya.
//
// Dua jenis saran:
//   1. Saran OTOMATIS dari submit yang baru gagal — halaman juri memanggil
//      reportSubmitFailure() di catch-nya, widget chat menangkap event-nya
//      dan menampilkan chip merah berisi data persis yang gagal terkirim.
//      Disimpan juga di sessionStorage supaya tetap ada walau chat baru
//      dibuka belakangan.
//   2. Template per TASK juri (dari assignment-nya: Start/Finish/Gate N/
//      Section N/Booyan R1, dst) — field kosong tinggal dilengkapi.

export const SUBMIT_FAILED_EVENT = "judge:submit-failed";
const STORAGE_KEY = "judgeChat:lastFailedSubmit";
// Laporan gagal lebih lama dari ini dianggap basi, tidak ditawarkan lagi.
const FAILURE_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export const CATEGORY_LABEL = {
  sprint: "Sprint",
  h2h: "Head to Head",
  slalom: "Slalom",
  drr: "Down River Race",
  rx: "Rafting Cross",
};

const REASON_LABEL = {
  timeout: "timeout",
  network: "koneksi terputus",
  server: "server error",
  realtime: "tersimpan, tapi belum sampai ke operator",
};

// Daftar task juri utk event + kategori ini, dari UserJudgeAssignments —
// aturannya SAMA dgn get*PositionsFromAssignments() di app/judges/*/page.jsx.
export function getJudgeTasks(assignments, eventId, category) {
  if (!Array.isArray(assignments) || !eventId) return [];
  const match = assignments
    .flatMap((item) => item.judges || [])
    .find((j) => String(j.eventId) === String(eventId));
  if (!match) return [];

  const tasks = [];
  if (category === "sprint" && match.sprint) {
    if (match.sprint.start) tasks.push("Start");
    if (match.sprint.finish) tasks.push("Finish");
  } else if (category === "h2h" && match.h2h) {
    const h = match.h2h;
    if (h.start) tasks.push("Pen. Start (S)");
    if (h.cl) tasks.push("Cut Line (CL)");
    if (h.finish) tasks.push("Pen. Finish (F)");
    if (h.other) tasks.push("Pen. Others (PO)");
    if (h.R1) tasks.push("Booyan R1");
    if (h.R2) tasks.push("Booyan R2");
    if (h.L1) tasks.push("Booyan L1");
    if (h.L2) tasks.push("Booyan L2");
  } else if (category === "slalom" && match.slalom) {
    const s = match.slalom;
    if (Array.isArray(s.gates)) tasks.push(...s.gates.map((g) => `Gate ${g}`));
    if (s.start === true) tasks.push("Start");
    if (s.finish === true) tasks.push("Finish");
  } else if (category === "drr" && match.drr) {
    const d = match.drr;
    if (Array.isArray(d.sections)) {
      tasks.push(...d.sections.map((s) => `Section ${s}`));
    }
    if (d.start) tasks.push("Start");
    if (d.finish) tasks.push("Finish");
  } else if (category === "rx" && match.rx) {
    if (Array.isArray(match.rx.gates)) {
      tasks.push(...match.rx.gates.map((g) => `Gate ${g}`));
    }
  }
  return tasks;
}

// Kegagalan submit yang layak dilaporkan lewat chat: error jaringan/timeout
// (exception) atau server error (5xx). Penolakan validasi (4xx, mis.
// duplikat) BUKAN masalah koneksi, jadi tidak ditawarkan.
export function isConnectionFailureStatus(status) {
  return Number(status) >= 500;
}

/**
 * Dipanggil halaman juri saat "Kirim ke Operator" gagal krn koneksi.
 * detail: { eventId, category, task, categoryLabel, team, bib, penalty,
 *           reason: "timeout"|"network"|"server"|"realtime" }
 */
export function reportSubmitFailure(detail) {
  if (typeof window === "undefined" || !detail) return;
  const payload = { ...detail, at: Date.now() };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // storage penuh/diblokir — event di bawah tetap jalan
  }
  window.dispatchEvent(new CustomEvent(SUBMIT_FAILED_EVENT, { detail: payload }));
}

export function readLastSubmitFailure(eventId, category) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const f = raw ? JSON.parse(raw) : null;
    if (!f) return null;
    if (String(f.eventId) !== String(eventId) || f.category !== category) {
      return null;
    }
    if (Date.now() - Number(f.at || 0) > FAILURE_MAX_AGE_MS) return null;
    return f;
  } catch {
    return null;
  }
}

export function clearLastSubmitFailure() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // abaikan
  }
}

function clock(ms) {
  const d = new Date(ms || Date.now());
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Pesan laporan lengkap dari submit yang gagal.
export function buildFailureMessage(f) {
  const lines = [
    `⚠️ LAPORAN MANUAL — Kirim ke Operator gagal (${REASON_LABEL[f.reason] || "error"})`,
    `Nomor Lomba: ${CATEGORY_LABEL[f.category] || f.category || "-"}`,
    `Task: ${f.task || "-"}`,
    `Kategori: ${f.categoryLabel || "-"}`,
    `Tim: ${f.team || "-"}${f.bib ? ` (BIB ${f.bib})` : ""}`,
    `Penalty: ${f.penalty !== undefined && f.penalty !== null && f.penalty !== "" ? f.penalty : "-"}`,
    `Jam submit: ${clock(f.at)}`,
  ];
  return lines.join("\n");
}

// Template laporan manual utk satu task — field kosong diisi juri.
export function buildTaskTemplate(category, task) {
  return [
    `📋 LAPORAN MANUAL — ${CATEGORY_LABEL[category] || category} · ${task}`,
    "Kategori: ",
    "Tim/BIB: ",
    "Penalty: ",
  ].join("\n");
}

// Pesan umum singkat seputar gangguan koneksi.
export const GENERAL_SUGGESTIONS = [
  {
    label: "Koneksi error",
    text: "Koneksi saya error, penalty belum terkirim ke operator. Mohon dicatat manual dari laporan saya di chat ini.",
  },
  {
    label: "Cek submit timeout",
    text: "Submit saya timeout — mohon cek apakah penalty sudah masuk sebelum saya kirim ulang.",
  },
  {
    label: "Koneksi normal",
    text: "Koneksi sudah normal kembali, saya lanjut submit lewat aplikasi.",
  },
];
