import mongoose from "mongoose";
import connectDB from "@/config/database";

export const dynamic = "force-dynamic";

// GET ?eventId=... — SEMUA Heat yang sudah di-assign operator lintas
// SELURUH kategori H2H (Division/Race/Initial) event ini sekaligus,
// dibaca LANGSUNG dari koleksi h2h_brackets (bukan H2HActiveRound yang
// cuma menyimpan 1 babak "aktif" per kategori) — atas permintaan user
// (2026-09-29): juri tidak perlu lagi pilih Kategori dulu, langsung
// dapat semua Heat yang sudah ter-assign, dengan info kategori tetap
// ditampilkan per Heat.
//
// `completed` = true kalau match itu sudah py `winner` (match riil sudah
// diputuskan pemenangnya di timing system) — dipakai juri utk tahu Heat
// mana yang tidak perlu/tidak bisa lagi diberi penalty (disable tombol).
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    if (!eventId) {
      return Response.json(
        { success: false, message: "eventId wajib diisi" },
        { status: 400 }
      );
    }

    const db = mongoose.connection.db;
    const docs = await db
      .collection("h2h_brackets")
      .find({ "bucket.eventId": String(eventId) })
      .toArray();

    const heats = [];
    docs.forEach((doc) => {
      const bucket = doc.bucket || {};
      const categoryLabel = `${bucket.divisionName || ""} ${
        bucket.raceName || ""
      } – ${bucket.initialName || ""}`.trim();

      (doc.rounds || []).forEach((round) => {
        (round.matches || []).forEach((match) => {
          const h = Number(match && match.heat) || 0;
          if (!match || match.bye || h <= 0) return;
          const has1 = !!(match.team1 && match.team1.name);
          const has2 = !!(match.team2 && match.team2.name);
          if (!has1 || !has2) return;

          heats.push({
            eventId: String(bucket.eventId || ""),
            initialId: String(bucket.initialId || ""),
            divisionId: String(bucket.divisionId || ""),
            raceId: String(bucket.raceId || ""),
            categoryLabel,
            roundId: round.id,
            roundName: round.bronze ? "Final B" : round.name,
            heat: h,
            team1: {
              teamId: match.team1.teamId || "",
              nameTeam: match.team1.name || "",
              bibTeam: match.team1.bibTeam || "",
            },
            team2: {
              teamId: match.team2.teamId || "",
              nameTeam: match.team2.name || "",
              bibTeam: match.team2.bibTeam || "",
            },
            completed: !!(match.winner && match.winner.name),
          });
        });
      });
    });

    heats.sort((a, b) => a.heat - b.heat);

    return Response.json({ success: true, heats });
  } catch (err) {
    console.error("❌ [h2h/all-heats] GET error:", err);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
