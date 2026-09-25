"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SingleEliminationBracket,
  SVGViewer,
  MATCH_STATES,
  createTheme,
} from "@g-loot/react-tournament-brackets";

// Profil ukuran per breakpoint — desktop butuh kotak lebih lega (nama tim
// panjang, waktu race lengkap kebaca), mobile butuh sekompak mungkin biar
// tidak semua ruang habis buat scroll horizontal antar babak. Breakpoint
// SAMA persis dgn Tailwind default (sm=640, lg=1024) supaya konsisten dgn
// sisa halaman.
const SIZE_PROFILES = {
  mobile: {
    boxWidth: 168,
    boxHeight: 66,
    spaceCols: 28,
    spaceRows: 10,
    canvasPadding: 16,
    roundHeaderHeight: 24,
    roundHeaderFontSize: 9,
    matchFontSize: 9,
    maxHeightClass: "max-h-[60vh]",
  },
  tablet: {
    boxWidth: 196,
    boxHeight: 74,
    spaceCols: 40,
    spaceRows: 14,
    canvasPadding: 20,
    roundHeaderHeight: 28,
    roundHeaderFontSize: 10,
    matchFontSize: 10,
    maxHeightClass: "max-h-[68vh]",
  },
  desktop: {
    boxWidth: 220,
    boxHeight: 84,
    spaceCols: 56,
    spaceRows: 20,
    canvasPadding: 24,
    roundHeaderHeight: 32,
    roundHeaderFontSize: 11,
    matchFontSize: 11,
    maxHeightClass: "max-h-[75vh]",
  },
};

function useBracketBreakpoint() {
  // Default "desktop" dulu (dipakai sesaat sebelum effect pertama jalan) —
  // komponen ini SELALU dynamic-import ssr:false (lihat LiveEventDetail.jsx),
  // jadi `window` sudah pasti ada begitu mount, tidak ada resiko mismatch
  // hydration walau initial state-nya belum tentu akurat utk 1 frame.
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

// Format singkat "hasil" satu tim di satu match, ditampilkan sbg
// resultText di kotak match — race time kalau ada, kalau tidak fallback
// ke Win/Lose, kosong kalau belum bertanding sama sekali. Jam "00:"
// dibuang (race H2H tidak pernah sejam) supaya lebih ringkas — kotak
// match ruangnya sempit, tiap karakter berharga.
function formatResultText(result) {
  if (!result) return "";
  if (result.flag) return result.flag; // DNF / DNS / DSQ
  if (result.totalTime) return String(result.totalTime).replace(/^00:/, "");
  if (result.winLose) return result.winLose;
  return "";
}

// team = team1/team2 satu match (lihat buildH2HBracket() di
// app/api/events/[eventId]/live-results/route.js) — {name, bibTeam,
// result} | null. `winner` = m.winner ({name}|null) dari dokumen yang sama.
function toParticipant(team, winner, sideKey) {
  if (!team || !team.name) {
    return { id: `${sideKey}-empty`, name: "TBD" };
  }
  const isBye = team.bibTeam === "BYE" || team.name === "BYE";
  return {
    id: team.bibTeam ? `${team.bibTeam}` : team.name,
    name: isBye
      ? "BYE"
      : `${team.name}${team.bibTeam ? ` (${team.bibTeam})` : ""}`,
    isWinner: !isBye && !!winner?.name && winner.name === team.name,
    resultText: isBye ? "" : formatResultText(team.result),
  };
}

// rounds -> matches[] rata (format @g-loot/react-tournament-brackets:
// tiap match tahu nextMatchId-nya sendiri, library yang susun jadi
// pohon). Round berikutnya SELALU separuh jumlah match round sekarang
// (bracket standar), jadi nextMatchId dihitung posisional: match ke-i
// round r -> match ke-floor(i/2) round r+1. Dipanggil terpisah utk main
// draw & Final B (bronze) — sama pola dgn dua <bracket> terpisah di
// sts-timingsystem (vtbRounds vs vtbBronzeRounds), krn Final B bukan
// pewaris langsung dari bracket utama.
function toLibraryMatches(rounds) {
  const idFor = (ri, mi) => `${ri}-${mi}`;
  const out = [];
  rounds.forEach((round, ri) => {
    const nextRound = rounds[ri + 1];
    (round.matches || []).forEach((m, mi) => {
      const nextMatchId = nextRound ? idFor(ri + 1, Math.floor(mi / 2)) : null;
      const hasWinner = !!m.winner?.name;
      out.push({
        id: idFor(ri, mi),
        nextMatchId,
        tournamentRoundText: round.name,
        startTime: "",
        state: hasWinner ? MATCH_STATES.PLAYED : MATCH_STATES.NO_PARTY,
        participants: [
          toParticipant(m.team1, m.winner, `${idFor(ri, mi)}-1`),
          toParticipant(m.team2, m.winner, `${idFor(ri, mi)}-2`),
        ],
      });
    });
  });
  return out;
}

// Match component KUSTOM — bawaan library (`Match`, styled-components)
// mengalokasikan kolom nama-tim/skor pakai lebar PERSENTASE, yang
// terbukti tidak reliable dirender di dalam <foreignObject> SVG (nama
// tim panjang tumpang-tindih dgn waktu di sisi kanan, dilaporkan user).
// Diganti flexbox biasa dgn `min-width:0` + `text-overflow:ellipsis` —
// pola standar utk truncate teks di anak flex, TIDAK PERNAH overlap
// berapa pun panjang nama timnya (dipotong "..." kalau kepanjangan,
// bukan menimpa elemen sebelah).
function BracketMatch({
  topParty,
  bottomParty,
  topWon,
  bottomWon,
  topHovered,
  bottomHovered,
  onMouseEnter,
  onMouseLeave,
}) {
  const rowStyle = (won, hovered) => ({
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    height: "50%",
    padding: "0 8px",
    gap: 6,
    background: won ? "#ecfdf5" : "#ffffff",
    borderLeft: `3px solid ${
      hovered ? "#4690B7" : won ? "#10b981" : "transparent"
    }`,
  });
  // BUG FIX: sebelumnya tidak ada `color` eksplisit di sini sama sekali
  // — ikut warisan warna ambient (putih), teks nama tim jadi tidak
  // terlihat di atas background terang kotak match. Warna eksplisit,
  // TIDAK bergantung inheritance apa pun.
  const nameStyle = (won) => ({
    flex: "1 1 auto",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
    color: won ? "#065f46" : "#111827",
  });
  const scoreStyle = (won) => ({
    flex: "0 0 auto",
    fontVariantNumeric: "tabular-nums",
    color: won ? "#047857" : "#9ca3af",
    whiteSpace: "nowrap",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        border: "1px solid #e5e7eb",
        borderRadius: 6,
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <div
        style={rowStyle(topWon, topHovered)}
        onMouseEnter={() => onMouseEnter(topParty.id)}
        onMouseLeave={onMouseLeave}
      >
        <span style={nameStyle(topWon)} title={topParty.name}>
          {topParty.name}
        </span>
        <span style={scoreStyle(topWon)}>{topParty.resultText}</span>
      </div>
      <div style={{ height: 1, background: "#e5e7eb", flex: "0 0 auto" }} />
      <div
        style={rowStyle(bottomWon, bottomHovered)}
        onMouseEnter={() => onMouseEnter(bottomParty.id)}
        onMouseLeave={onMouseLeave}
      >
        <span style={nameStyle(bottomWon)} title={bottomParty.name}>
          {bottomParty.name}
        </span>
        <span style={scoreStyle(bottomWon)}>{bottomParty.resultText}</span>
      </div>
    </div>
  );
}

function canvasSize(rounds, p) {
  const roundsCount = rounds.length || 1;
  const firstRoundMatches = rounds[0]?.matches?.length || 1;
  const width =
    roundsCount * (p.boxWidth + p.spaceCols) + p.canvasPadding * 2 + 40;
  const height =
    firstRoundMatches * (p.boxHeight + p.spaceRows) + p.canvasPadding * 2 + 40;
  return { width, height: Math.max(height, 180) };
}

function BracketBlock({ title, rounds, matches, profile }) {
  if (!matches.length) return null;
  const { width, height } = canvasSize(rounds, profile);

  const style = {
    width: profile.boxWidth,
    boxHeight: profile.boxHeight,
    canvasPadding: profile.canvasPadding,
    spaceBetweenColumns: profile.spaceCols,
    spaceBetweenRows: profile.spaceRows,
    connectorColor: "#d1d5db",
    connectorColorHighlight: "#4690B7",
    roundHeader: {
      isShown: true,
      height: profile.roundHeaderHeight,
      marginBottom: Math.round(profile.roundHeaderHeight / 2),
      fontSize: profile.roundHeaderFontSize,
      fontColor: "#ffffff",
      backgroundColor: "#334155", // slate-700, senada dgn header tabel Live Result
      fontFamily: "inherit",
    },
  };

  return (
    <div className="w-full">
      {title ? (
        <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-sts mb-2">
          {title}
        </h4>
      ) : null}
      <div
        className={`w-full overflow-auto rounded-xl border border-gray-200 bg-gray-50/50 p-2 sm:p-3 ${profile.maxHeightClass}`}
        // Team/Score/TopText/BottomText di komponen Match bawaan library
        // TIDAK punya font-size sendiri (cuma warisan CSS) — nge-set di
        // sini cukup, otomatis turun ke konten <foreignObject> di dalam
        // SVG tanpa perlu bikin matchComponent custom.
        style={{ fontSize: profile.matchFontSize }}
      >
        <SingleEliminationBracket
          matches={matches}
          matchComponent={BracketMatch}
          theme={BRACKET_THEME}
          options={{ style }}
          svgWrapper={({ children, ...props }) => (
            <SVGViewer width={width} height={height} {...props}>
              {children}
            </SVGViewer>
          )}
        />
      </div>
    </div>
  );
}

// Tema terang (light) — bawaan library gelap, jadi semua warna di-override
// via createTheme() (deep-merge dgn default lib, bukan replace mentah)
// supaya key yang tidak di-override tetap punya fallback yang aman.
const BRACKET_THEME = createTheme({
  fontFamily: "inherit",
  textColor: { main: "#111827", highlighted: "#0f172a", dark: "#9ca3af" },
  matchBackground: { wonColor: "#ecfdf5", lostColor: "#ffffff" },
  score: {
    background: { wonColor: "#d1fae5", lostColor: "#f3f4f6" },
    text: { highlightedWonColor: "#047857", highlightedLostColor: "#9ca3af" },
  },
  border: { color: "#e5e7eb", highlightedColor: "#4690B7" },
  roundHeaders: { background: "#334155" },
  canvasBackground: "#ffffff",
});

export default function HeadToHeadBracket({ bracket }) {
  const bp = useBracketBreakpoint();
  const profile = SIZE_PROFILES[bp];

  const { mainRounds, bronzeRounds, mainMatches, bronzeMatches } =
    useMemo(() => {
      const rounds = Array.isArray(bracket?.rounds) ? bracket.rounds : [];
      const main = rounds.filter((r) => !r.bronze);
      const bronze = rounds.filter((r) => r.bronze);
      return {
        mainRounds: main,
        bronzeRounds: bronze,
        mainMatches: toLibraryMatches(main),
        bronzeMatches: toLibraryMatches(bronze),
      };
    }, [bracket]);

  if (!mainMatches.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 sm:py-10 text-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-8 h-8 sm:w-10 sm:h-10 text-gray-300"
        >
          <path
            d="M4 5h4v4H4V5Zm0 10h4v4H4v-4Zm12-10h4v4h-4V5Zm0 10h4v4h-4v-4M8 7h6M8 17h6M18 7v10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-gray-500 text-xs sm:text-sm">
          Bracket belum dibuat untuk kategori ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <BracketBlock rounds={mainRounds} matches={mainMatches} profile={profile} />
      {bronzeMatches.length ? (
        <BracketBlock
          title="Final B — Perebutan Juara 3"
          rounds={bronzeRounds}
          matches={bronzeMatches}
          profile={profile}
        />
      ) : null}

      {/* Legenda — bantu penonton awam baca warna kotak match. Wrap rapat
          di mobile (gap lebih kecil, font lebih kecil) supaya tidak makan
          banyak baris di layar sempit. */}
      <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-1.5 text-[10px] sm:text-[11px] text-gray-500 pt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-50 ring-1 ring-emerald-200 inline-block shrink-0" />
          Menang
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-white ring-1 ring-gray-200 inline-block shrink-0" />
          Kalah / belum bertanding
        </span>
        <span className="flex items-center gap-1.5">
          <span className="px-1 py-px rounded bg-gray-100 text-gray-500 ring-1 ring-gray-200 shrink-0">
            TBD
          </span>
          Menunggu hasil babak sebelumnya
        </span>
      </div>
    </div>
  );
}
