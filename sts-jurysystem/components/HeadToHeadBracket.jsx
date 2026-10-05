"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Bracket Head to Head utk Live Result publik.
//
// Data = buildH2HBracket() di app/api/events/[eventId]/live-results/route.js
// (mirror h2h_brackets dari sts-timingsystem + hasil per babak dari
// h2h_results): { rounds: [{ id, name, bronze, size, matches: [{ heat, bye,
// team1, team2, winner }] }], showBronze }.
//
// Digambar SENDIRI (div absolut + SVG garis), bukan library bracket — posisi
// kotak & garis penghubung dihitung dari data, jadi garis selalu menuju
// match babak berikutnya yang BENAR-BENAR berisi pemenangnya (timingsystem
// menempatkan pemenang ke slot kosong pertama, bukan pairing geometris).
//
// Responsif:
// - mobile  (<640)  : tab babak + daftar kartu vertikal (scroll native).
// - tablet  (<1024) : pohon bracket, kartu lebih ringkas, auto-fit lebar.
// - desktop         : pohon bracket ukuran penuh, auto-fit lebar.

const SIZE_PROFILES = {
  // headerH = bar nama babak (barH) + baris status babak di bawahnya.
  tablet: { cardW: 236, cardH: 96, colGap: 36, rowGap: 16, headerH: 64, barH: 32 },
  desktop: { cardW: 284, cardH: 104, colGap: 64, rowGap: 22, headerH: 68, barH: 36 },
};
const BRONZE_LABEL_H = 30;
const MIN_SCALE = 0.62;

function useBreakpoint() {
  // Komponen ini selalu di-import dinamis ssr:false (LiveEventDetail.jsx),
  // jadi `window` sudah ada saat mount.
  const [bp, setBp] = useState("desktop");
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setBp(w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    compute();
    let raf = null;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return bp;
}

function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/* ============================ data helpers ============================ */

// Identitas tim = nama + BIB (sama dgn _teamIdentityKey() di timingsystem).
const teamKey = (t) =>
  t && t.name
    ? `${String(t.name).trim().toUpperCase()}|${String(t.bibTeam || "").trim()}`
    : "";

// Hasil singkat satu tim di satu match — flag atau waktu (total, fallback
// race time; jam "00:" dibuang, race H2H tidak pernah sejam). Sengaja TIDAK
// menampilkan Win/Lose (permintaan user 2026-10-06): menang/kalah sudah
// terlihat dari sorotan baris, yang ditampilkan selalu waktunya.
function formatResultText(result) {
  if (!result) return "";
  if (result.flag) return result.flag; // DNF / DNS / DSQ
  const t = result.totalTime || result.raceTime;
  if (t) return String(t).replace(/^00:/, "");
  return "";
}

// team1/team2 -> bentuk tampilan. BYE di timingsystem = satu sisi KOSONG
// pada match ber-flag bye (bukan tim bernama "BYE").
function toSide(team, match) {
  const decided = !!match.winner?.name;
  if (!team || !team.name) {
    return { kind: match.bye ? "bye" : "tbd", key: "" };
  }
  if (team.bibTeam === "BYE" || team.name === "BYE") return { kind: "bye", key: "" };
  const key = teamKey(team);
  const isWinner = decided && key === teamKey(match.winner);
  return {
    kind: "team",
    key,
    name: team.name,
    bib: team.bibTeam || "",
    // Match sudah selesai tapi waktu tim ini tidak tersimpan -> "—".
    // (BYE tidak bertanding -> tanpa tanda.)
    result: formatResultText(team.result) || (decided && !match.bye ? "—" : ""),
    isWinner,
    isLoser: decided && !isWinner,
  };
}

function matchStatus(m) {
  const has1 = !!m.team1?.name;
  const has2 = !!m.team2?.name;
  if (m.winner?.name) return m.bye ? "bye" : "done";
  if (has1 && has2) return m.heat != null ? "ready" : "noheat";
  return "waiting";
}

function normalizeRound(round) {
  const matches = (round.matches || []).map((m, mi) => ({
    key: `${round.id}-${mi}`,
    no: mi + 1,
    heat: m.heat != null ? m.heat : null,
    bye: !!m.bye,
    status: matchStatus(m),
    winnerKey: teamKey(m.winner),
    top: toSide(m.team1, m),
    bottom: toSide(m.team2, m),
  }));
  const decided = matches.filter((m) => m.status === "done" || m.status === "bye").length;
  return {
    id: round.id,
    name: round.bronze ? "Final B" : round.name,
    bronze: !!round.bronze,
    raw: round,
    matches,
    decided,
    complete: matches.length > 0 && decided === matches.length,
  };
}

// Index match babak berikutnya utk tiap match di `round` — ke match yang
// berisi pemenangnya; sisanya ke posisi standar floor(i/2) kalau masih muat,
// kalau tidak ke match pertama yang anaknya < 2 (tiap match maks 2 anak).
function resolveNextMatchIndexes(round, nextRound) {
  const matches = round.matches || [];
  const nextMatches = nextRound.matches || [];
  const result = new Array(matches.length).fill(null);
  const childCount = new Array(nextMatches.length).fill(0);

  matches.forEach((m, mi) => {
    const wk = teamKey(m.winner);
    if (!wk) return;
    const target = nextMatches.findIndex(
      (nm, ni) =>
        childCount[ni] < 2 && (teamKey(nm.team1) === wk || teamKey(nm.team2) === wk)
    );
    if (target >= 0) {
      result[mi] = target;
      childCount[target] += 1;
    }
  });

  matches.forEach((_m, mi) => {
    if (result[mi] !== null) return;
    let target = Math.floor(mi / 2);
    if (!(target < nextMatches.length && childCount[target] < 2)) {
      target = childCount.findIndex((c) => c < 2);
    }
    if (target >= 0) {
      result[mi] = target;
      childCount[target] += 1;
    }
  });

  return result;
}

// Posisi semua kartu (px, sebelum di-scale) + garis penghubung.
function computeLayout(mainRounds, bronzeRound, p) {
  const top = p.headerH + 14;
  const pos = []; // pos[r][m] = { x, y }
  const links = [];

  mainRounds.forEach((round, r) => {
    const x = r * (p.cardW + p.colGap);
    const n = round.matches.length;
    if (r === 0) {
      pos.push(round.matches.map((_m, i) => ({ x, y: top + i * (p.cardH + p.rowGap) })));
      return;
    }
    const prev = mainRounds[r - 1];
    const nextIdx = resolveNextMatchIndexes(prev.raw, round.raw);
    const children = round.matches.map(() => []);
    nextIdx.forEach((j, ci) => {
      if (j !== null && children[j]) children[j].push(ci);
    });
    const firstH = Math.max(1, pos[0].length) * (p.cardH + p.rowGap) - p.rowGap;
    const ys = round.matches.map((_m, j) => {
      const kids = children[j];
      if (kids.length) {
        const centers = kids.map((ci) => pos[r - 1][ci].y + p.cardH / 2);
        return centers.reduce((a, b) => a + b, 0) / centers.length - p.cardH / 2;
      }
      return top + ((j + 0.5) * firstH) / Math.max(1, n) - p.cardH / 2;
    });
    // Jaga urutan & tidak bertumpuk.
    for (let j = 1; j < ys.length; j++) {
      ys[j] = Math.max(ys[j], ys[j - 1] + p.cardH + p.rowGap);
    }
    pos.push(ys.map((y) => ({ x, y: Math.max(top, y) })));

    nextIdx.forEach((j, ci) => {
      if (j === null || !pos[r][j]) return;
      const from = pos[r - 1][ci];
      const to = pos[r][j];
      const child = prev.matches[ci];
      const target = round.matches[j];
      const advanced =
        !!child.winnerKey &&
        (target.top.key === child.winnerKey || target.bottom.key === child.winnerKey);
      links.push({
        key: `${child.key}->${target.key}`,
        x1: from.x + p.cardW,
        y1: from.y + p.cardH / 2,
        x2: to.x,
        y2: to.y + p.cardH / 2,
        advanced,
      });
    });
  });

  let bronzePos = null;
  if (bronzeRound && bronzeRound.matches.length && mainRounds.length) {
    const last = pos[pos.length - 1] || [];
    const lastBottom = last.reduce((m, q) => Math.max(m, q.y + p.cardH), top);
    bronzePos = {
      x: (mainRounds.length - 1) * (p.cardW + p.colGap),
      labelY: lastBottom + 26,
      y: lastBottom + 26 + BRONZE_LABEL_H,
    };
  }

  let height = top;
  pos.forEach((col) => col.forEach((q) => (height = Math.max(height, q.y + p.cardH))));
  if (bronzePos) height = Math.max(height, bronzePos.y + p.cardH);
  const width = Math.max(1, mainRounds.length) * (p.cardW + p.colGap) - p.colGap;

  return { pos, links, bronzePos, width, height: height + 6 };
}

const isFinalARound = (mainRounds, idx) =>
  idx === mainRounds.length - 1 && mainRounds.length > 1 && mainRounds[idx].matches.length === 1;

// Juara 1-4 dari Final A (main draw terakhir) & Final B.
function computePodium(mainRounds, bronzeRound) {
  const finalRound = mainRounds[mainRounds.length - 1];
  const fm = finalRound && finalRound.matches.length === 1 ? finalRound.matches[0] : null;
  const bm = bronzeRound && bronzeRound.matches[0];
  const pick = (m, winner) => {
    if (!m || m.status !== "done") return null;
    const side = [m.top, m.bottom].find((s) => s.kind === "team" && s.isWinner === winner);
    return side ? { name: side.name, bib: side.bib } : null;
  };
  const places = [
    { place: 1, label: "Juara 1", team: pick(fm, true) },
    { place: 2, label: "Juara 2", team: pick(fm, false) },
  ];
  if (bronzeRound) {
    places.push({ place: 3, label: "Juara 3", team: pick(bm, true) });
    places.push({ place: 4, label: "Peringkat 4", team: pick(bm, false) });
  }
  return places;
}

/* ============================== UI parts ============================== */

const STATUS_META = {
  done: { label: "Selesai", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  bye: { label: "BYE", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
  ready: { label: "Siap", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  noheat: { label: "Menunggu Heat", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  waiting: { label: "Menunggu", cls: "bg-slate-50 text-slate-500 ring-slate-200" },
};

// Status hasil per babak (Provisional/Unofficial/Official) — ditetapkan
// operator di sts-timingsystem (H2H Result, per tab babak). Warna sama dgn
// badge status kategori di LiveEventDetail.jsx.
const RESULT_STATUS_META = {
  provisional: { label: "Provisional", cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  unofficial: { label: "Unofficial", cls: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  official: { label: "Official", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
};

function ResultStatusChip({ info, showTime = true }) {
  if (!info) return null;
  const meta = RESULT_STATUS_META[info.status] || RESULT_STATUS_META.provisional;
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span
        className={`shrink-0 inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-px rounded-full ring-1 ${meta.cls}`}
        title="Status hasil babak ini, ditetapkan operator timing"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>
      {showTime && info.setAt ? (
        <span className="text-[10px] text-slate-400 truncate">{info.setAt}</span>
      ) : null}
    </span>
  );
}

function CheckIcon({ className }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TrophyIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 4h8v5a4 4 0 0 1-8 0V4Zm0 1H5v1.5A3.5 3.5 0 0 0 8.5 10M16 5h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 13v4m-3.5 3h7l-.6-3H9.1l-.6 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SideRow({ side, compact }) {
  const pad = compact ? "px-2.5" : "px-3";
  if (side.kind !== "team") {
    return (
      <div className={`flex-1 flex items-center gap-2 ${pad} min-w-0`}>
        <span className="w-8 shrink-0" />
        <span className="text-xs italic text-slate-400 truncate">
          {side.kind === "bye" ? "BYE" : "Menunggu pemenang"}
        </span>
      </div>
    );
  }
  const won = side.isWinner;
  const lost = side.isLoser;
  return (
    <div
      className={`relative flex-1 flex items-center gap-2 ${pad} min-w-0 ${
        won ? "bg-emerald-50/80" : ""
      }`}
    >
      {won ? <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500" /> : null}
      <span
        className={`w-8 shrink-0 text-center rounded-md py-0.5 text-[10px] font-bold tabular-nums ${
          won ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
        }`}
        title="BIB"
      >
        {side.bib || "-"}
      </span>
      <span
        className={`flex-1 min-w-0 line-clamp-2 break-words text-[12px] leading-[1.2] ${
          won
            ? "font-bold text-emerald-900"
            : lost
            ? "font-medium text-slate-400"
            : "font-semibold text-slate-800"
        }`}
        title={side.name}
      >
        {side.name}
      </span>
      {side.result ? (
        <span
          className={`shrink-0 text-[11px] font-semibold tabular-nums ${
            won ? "font-bold text-emerald-700" : "text-slate-400"
          }`}
        >
          {side.result}
        </span>
      ) : null}
      {won ? <CheckIcon className="w-3.5 h-3.5 shrink-0 text-emerald-600" /> : null}
    </div>
  );
}

function MatchCard({ match, label, compact = false, highlight = false }) {
  const st = STATUS_META[match.status] || STATUS_META.waiting;
  return (
    <div
      className={`h-full w-full flex flex-col overflow-hidden rounded-xl bg-white border shadow-sm ${
        highlight ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2 h-[26px] px-2.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 truncate">
          {label || `Match ${match.no}`}
          {match.heat != null ? (
            <span className="ml-1.5 normal-case tracking-normal font-bold text-sts">
              · Heat {match.heat}
            </span>
          ) : null}
        </span>
        <span className={`shrink-0 text-[9.5px] font-semibold px-1.5 py-px rounded-full ring-1 ${st.cls}`}>
          {st.label}
        </span>
      </div>
      <SideRow side={match.top} compact={compact} />
      <div className="h-px bg-slate-100 shrink-0" />
      <SideRow side={match.bottom} compact={compact} />
    </div>
  );
}

const PODIUM_TONE = {
  1: { ring: "ring-amber-300", bg: "from-amber-50 to-white", badge: "bg-amber-400 text-white", icon: "text-amber-500" },
  2: { ring: "ring-slate-300", bg: "from-slate-100 to-white", badge: "bg-slate-400 text-white", icon: "text-slate-400" },
  3: { ring: "ring-orange-300", bg: "from-orange-50 to-white", badge: "bg-orange-400 text-white", icon: "text-orange-500" },
  4: { ring: "ring-slate-200", bg: "from-white to-white", badge: "bg-slate-200 text-slate-600", icon: "text-slate-300" },
};

function Podium({ places }) {
  return (
    <div className={`grid gap-2 sm:gap-3 ${places.length > 2 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`}>
      {places.map((p) => {
        const t = PODIUM_TONE[p.place];
        return (
          <div
            key={p.place}
            className={`flex items-center gap-2.5 sm:gap-3 rounded-xl bg-gradient-to-br ${t.bg} ring-1 ${t.ring} px-3 py-2.5 min-w-0`}
          >
            <span
              className={`flex w-8 h-8 sm:w-9 sm:h-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${t.badge}`}
            >
              {p.place}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {p.place <= 3 ? <TrophyIcon className={`w-3.5 h-3.5 ${t.icon}`} /> : null}
                {p.label}
              </p>
              {p.team ? (
                <p className="text-[13px] sm:text-sm font-bold text-slate-900 leading-tight line-clamp-2 lg:line-clamp-1 break-words" title={p.team.name}>
                  {p.team.name}
                  {p.team.bib ? (
                    <span className="ml-1 text-[11px] font-semibold text-slate-400">#{p.team.bib}</span>
                  ) : null}
                </p>
              ) : (
                <p className="text-[12px] sm:text-[13px] italic text-slate-400 truncate">Belum ditentukan</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BracketTree({ mainRounds, bronzeRound, activeRoundId, profileKey, roundStatus }) {
  const p = SIZE_PROFILES[profileKey];
  const layout = useMemo(
    () => computeLayout(mainRounds, bronzeRound, p),
    [mainRounds, bronzeRound, p]
  );
  const [ref, containerWidth] = useElementWidth();

  const PAD = 20;
  const naturalW = layout.width + PAD * 2;
  const naturalH = layout.height + PAD * 2;
  const scale =
    containerWidth > 0 ? Math.max(MIN_SCALE, Math.min(1, containerWidth / naturalW)) : 1;
  const compact = profileKey === "tablet";

  return (
    <div
      ref={ref}
      className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50"
      style={{
        backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    >
      <div style={{ width: naturalW * scale, height: naturalH * scale }}>
        <div
          className="relative"
          style={{
            width: naturalW,
            height: naturalH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            className="absolute"
            style={{ left: PAD, top: PAD, width: layout.width, height: layout.height }}
          >
            {/* Header babak */}
            {mainRounds.map((round, r) => {
              const isActive = round.id === activeRoundId;
              return (
                <div
                  key={`h-${round.id}`}
                  className="absolute"
                  style={{ left: r * (p.cardW + p.colGap), top: 0, width: p.cardW }}
                >
                <div
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 text-white ${
                    isActive ? "bg-sts shadow-sm" : "bg-slate-800"
                  }`}
                  style={{ height: p.barH }}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider truncate">
                    {isFinalARound(mainRounds, r) ? "Final A" : round.name}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {isActive ? (
                      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-white/20 rounded-full px-1.5 py-px">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Berjalan
                      </span>
                    ) : null}
                    <span
                      className={`text-[10px] font-semibold tabular-nums ${
                        round.complete ? "text-emerald-300" : "text-white/60"
                      }`}
                    >
                      {round.decided}/{round.matches.length}
                    </span>
                  </span>
                </div>
                <div className="flex items-center mt-1.5 px-0.5 min-w-0">
                  <ResultStatusChip info={roundStatus && roundStatus[round.id]} />
                </div>
                </div>
              );
            })}

            {/* Garis penghubung */}
            <svg
              className="absolute inset-0 overflow-visible"
              width={layout.width}
              height={layout.height}
              aria-hidden="true"
            >
              {layout.links.map((l) => {
                const mx = l.x1 + (l.x2 - l.x1) / 2;
                return (
                  <path
                    key={l.key}
                    d={`M${l.x1} ${l.y1} H${mx} V${l.y2} H${l.x2}`}
                    fill="none"
                    stroke={l.advanced ? "#1874A5" : "#cbd5e1"}
                    strokeWidth={l.advanced ? 2 : 1.5}
                    strokeLinejoin="round"
                  />
                );
              })}
            </svg>

            {/* Kartu match */}
            {mainRounds.map((round, r) =>
              round.matches.map((m, i) => {
                const q = layout.pos[r][i];
                const finalA = isFinalARound(mainRounds, r);
                return (
                  <div
                    key={m.key}
                    className="absolute"
                    style={{ left: q.x, top: q.y, width: p.cardW, height: p.cardH }}
                  >
                    <MatchCard
                      match={m}
                      label={finalA ? "Final A" : undefined}
                      compact={compact}
                      highlight={finalA}
                    />
                  </div>
                );
              })
            )}

            {/* Final B di kolom terakhir, di bawah Final A */}
            {layout.bronzePos ? (
              <>
                <div
                  className="absolute flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-orange-600"
                  style={{
                    left: layout.bronzePos.x,
                    top: layout.bronzePos.labelY,
                    width: p.cardW,
                    height: BRONZE_LABEL_H - 6,
                  }}
                >
                  <TrophyIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Final B · Juara 3</span>
                  <span className="ml-auto normal-case tracking-normal">
                    <ResultStatusChip
                      info={roundStatus && roundStatus[bronzeRound.id]}
                      showTime={false}
                    />
                  </span>
                </div>
                <div
                  className="absolute"
                  style={{
                    left: layout.bronzePos.x,
                    top: layout.bronzePos.y,
                    width: p.cardW,
                    height: p.cardH,
                  }}
                >
                  <MatchCard match={bronzeRound.matches[0]} label="Final B" compact={compact} />
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileRounds({ rounds, activeIndex, roundStatus }) {
  const [selected, setSelected] = useState(activeIndex);
  useEffect(() => setSelected(activeIndex), [activeIndex]);
  const idx = Math.min(Math.max(0, selected), rounds.length - 1);
  const round = rounds[idx];
  if (!round) return null;

  return (
    <div className="w-full">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 snap-x">
        {rounds.map((r, i) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelected(i)}
            className={`shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
              i === idx ? "bg-white text-sts shadow-sm" : "text-slate-500"
            }`}
          >
            {roundStatus && roundStatus[r.id] ? (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  (RESULT_STATUS_META[roundStatus[r.id].status] || RESULT_STATUS_META.provisional).dot
                }`}
                title={(RESULT_STATUS_META[roundStatus[r.id].status] || RESULT_STATUS_META.provisional).label}
              />
            ) : null}
            {r.label}
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] tabular-nums ${
                r.complete ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              {r.complete ? <CheckIcon className="w-3 h-3" /> : null}
              {r.decided}/{r.matches.length}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 mb-2 px-0.5 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[13px] font-bold text-slate-900">{round.label}</h4>
          <span className="text-[11px] text-slate-400 shrink-0">
            {round.decided}/{round.matches.length} match selesai
          </span>
        </div>
        <ResultStatusChip info={roundStatus && roundStatus[round.id]} />
      </div>

      <div className="space-y-2.5">
        {round.matches.length ? (
          round.matches.map((m) => (
            <div key={m.key} style={{ height: 104 }}>
              <MatchCard
                match={m}
                label={round.isFinalA ? "Final A" : round.bronze ? "Final B" : undefined}
                highlight={round.isFinalA}
              />
            </div>
          ))
        ) : (
          <p className="text-slate-400 text-xs text-center py-6">Belum ada pasangan di babak ini.</p>
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] sm:text-[11px] text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 rounded bg-emerald-50 ring-1 ring-emerald-300 inline-flex items-center justify-center">
          <CheckIcon className="w-2.5 h-2.5 text-emerald-600" />
        </span>
        Pemenang (lanjut)
      </span>
      <span className="hidden sm:flex items-center gap-1.5">
        <span className="w-6 h-0.5 rounded bg-sts inline-block" />
        Jalur pemenang
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-[10px] italic text-slate-400">BYE</span>— lolos tanpa lawan
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-[10px] italic text-slate-400">Menunggu pemenang</span>— belum ditentukan
      </span>
    </div>
  );
}

export default function HeadToHeadBracket({ bracket, roundStatus }) {
  const bp = useBreakpoint();

  const data = useMemo(() => {
    const rounds = Array.isArray(bracket?.rounds) ? bracket.rounds : [];
    const main = rounds.filter((r) => !r.bronze).map(normalizeRound);
    const bronzeRaw = rounds.find((r) => r.bronze);
    const bronze = bronzeRaw ? normalizeRound(bronzeRaw) : null;

    // Babak berjalan = babak main draw pertama yang belum semua match-nya
    // selesai (atau Final B kalau main draw sudah selesai semua).
    let active = main.find((r) => r.matches.length && !r.complete) || null;
    if (!active && bronze && bronze.matches.length && !bronze.complete) active = bronze;

    const mobileRounds = [
      ...main.map((r, i) => {
        const isFinalA = isFinalARound(main, i);
        return { ...r, isFinalA, label: isFinalA ? "Final A" : r.name };
      }),
      ...(bronze ? [{ ...bronze, isFinalA: false, label: "Final B" }] : []),
    ];
    const activeMobileIndex = Math.max(
      0,
      active ? mobileRounds.findIndex((r) => r.id === active.id) : mobileRounds.length - 1
    );
    const activeLabel = active
      ? mobileRounds.find((r) => r.id === active.id)?.label || active.name
      : null;

    const allMatches = mobileRounds.reduce((n, r) => n + r.matches.length, 0);
    const doneMatches = mobileRounds.reduce((n, r) => n + r.decided, 0);

    return {
      main,
      bronze,
      active,
      activeLabel,
      mobileRounds,
      activeMobileIndex,
      podium: computePodium(main, bronze),
      allMatches,
      doneMatches,
    };
  }, [bracket]);

  if (!data.main.some((r) => r.matches.length)) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-slate-300">
          <path
            d="M4 5h4v4H4V5Zm0 10h4v4H4v-4Zm12-10h4v4h-4V5Zm0 10h4v4h-4v-4M8 7h6M8 17h6M18 7v10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-slate-600 text-sm font-semibold">Bracket belum dibuat</p>
        <p className="text-slate-400 text-xs">
          Bagan tampil otomatis begitu operator menyusun pertandingan.
        </p>
      </div>
    );
  }

  const pct = data.allMatches ? Math.round((data.doneMatches / data.allMatches) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <Podium places={data.podium} />

      {/* Ringkasan progres turnamen */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
            Babak berjalan
          </span>
          <span className="text-[13px] font-bold text-slate-900 truncate">
            {data.activeLabel || "Turnamen selesai"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 sm:ml-auto sm:w-72">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sts to-emerald-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 tabular-nums shrink-0">
            {data.doneMatches}/{data.allMatches} match
          </span>
        </div>
      </div>

      {bp === "mobile" ? (
        <MobileRounds
          rounds={data.mobileRounds}
          activeIndex={data.activeMobileIndex}
          roundStatus={roundStatus}
        />
      ) : (
        <BracketTree
          mainRounds={data.main}
          bronzeRound={data.bronze}
          activeRoundId={data.active ? data.active.id : null}
          profileKey={bp}
          roundStatus={roundStatus}
        />
      )}

      <Legend />
    </div>
  );
}
