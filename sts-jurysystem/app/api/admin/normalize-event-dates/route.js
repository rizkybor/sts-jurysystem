import connectDB from "@/config/database";
import mongoose from "mongoose";

// One-off maintenance endpoint — TIDAK dipanggil dari UI manapun, harus
// di-trigger manual oleh admin saat siap.
//
// Kenapa ini perlu: `Event.startDateEvent`/`endDateEvent` dideklarasikan
// sebagai `Date` di schema Mongoose (models/Event.js), tapi sebagian
// dokumen tersimpan sebagai STRING mentah (kemungkinan ditulis lewat
// native MongoDB driver dari luar app ini, yang tidak melalui casting
// Mongoose). Akibatnya, /api/matches?sort=nearest (dipakai default oleh
// /live & /matches) TIDAK BISA memakai index pada startDateEvent — dia
// harus $convert setiap dokumen jadi Date dulu di dalam aggregation
// sebelum bisa di-sort, artinya full collection scan tiap request,
// makin lambat seiring jumlah event bertambah.
//
// Endpoint ini menormalkan startDateEvent/endDateEvent yang masih string
// jadi Date asli — idempotent & aman dijalankan berkali-kali (dokumen yang
// sudah Date dilewati). SETELAH dijalankan sukses (dryRun=false) dan
// dikonfirmasi count "stillString" jadi 0, baru aman menyederhanakan
// aggregation di /api/matches jadi $sort langsung pakai index
// (eventName_1_startDateEvent_1 yang sudah ada di models/Event.js), tanpa
// $convert/$addFields lagi.
//
// Default dryRun=true — HANYA membaca & menghitung, TIDAK menulis apapun.
// Panggil dgn ?dryRun=false utk benar-benar menerapkan perubahan.
// Gerbang keamanan: endpoint ini TIDAK tercakup middleware.js (bukan
// halaman UI), dan tidak ada konsep "admin role" di app ini (models/User.js
// tidak punya field role) — jadi wajib set env var ADMIN_MIGRATION_TOKEN
// dan kirim sebagai header `x-admin-token` sebelum endpoint ini mau
// berjalan sama sekali. Fail-closed: kalau env var belum diset, endpoint
// selalu menolak (bukan default-terbuka).
function assertAdminToken(req) {
  const expected = process.env.ADMIN_MIGRATION_TOKEN;
  if (!expected) {
    throw new Error(
      "ADMIN_MIGRATION_TOKEN belum diset di environment — endpoint ini sengaja dikunci sampai variable itu ada."
    );
  }
  const given = req.headers.get("x-admin-token");
  if (given !== expected) {
    throw new Error("Unauthorized");
  }
}

export async function POST(req) {
  try {
    assertAdminToken(req);
    await connectDB();
    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get("dryRun") !== "false";

    const db = mongoose.connection.db;
    const col = db.collection("eventsCollection");

    const stringDateDocs = await col
      .find(
        {
          $or: [
            { $expr: { $eq: [{ $type: "$startDateEvent" }, "string"] } },
            { $expr: { $eq: [{ $type: "$endDateEvent" }, "string"] } },
          ],
        },
        { projection: { eventName: 1, startDateEvent: 1, endDateEvent: 1 } }
      )
      .toArray();

    const plan = [];
    for (const doc of stringDateDocs) {
      const set = {};
      const invalid = [];

      if (typeof doc.startDateEvent === "string") {
        const d = new Date(doc.startDateEvent);
        if (!Number.isNaN(d.getTime())) set.startDateEvent = d;
        else invalid.push("startDateEvent");
      }
      if (typeof doc.endDateEvent === "string") {
        const d = new Date(doc.endDateEvent);
        if (!Number.isNaN(d.getTime())) set.endDateEvent = d;
        else invalid.push("endDateEvent");
      }

      plan.push({
        _id: String(doc._id),
        eventName: doc.eventName,
        before: {
          startDateEvent: doc.startDateEvent,
          endDateEvent: doc.endDateEvent,
        },
        willSet: set,
        invalid,
      });
    }

    if (dryRun) {
      return Response.json({
        success: true,
        dryRun: true,
        totalStringDateDocs: stringDateDocs.length,
        plan,
        message:
          "Dry run — tidak ada perubahan ditulis. Panggil ulang dgn ?dryRun=false utk menerapkan.",
      });
    }

    let updated = 0;
    let skippedInvalid = 0;
    for (const item of plan) {
      if (Object.keys(item.willSet).length === 0) {
        skippedInvalid++;
        continue;
      }
      await col.updateOne(
        { _id: new mongoose.Types.ObjectId(item._id) },
        { $set: item.willSet }
      );
      updated++;
    }

    return Response.json({
      success: true,
      dryRun: false,
      totalStringDateDocs: stringDateDocs.length,
      updated,
      skippedInvalid,
    });
  } catch (err) {
    const isAuthError =
      err.message === "Unauthorized" ||
      err.message.includes("ADMIN_MIGRATION_TOKEN");
    if (!isAuthError) console.error("❌ [normalize-event-dates]", err);
    return Response.json(
      { success: false, message: err.message },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
