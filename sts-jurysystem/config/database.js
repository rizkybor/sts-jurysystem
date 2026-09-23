import mongoose from "mongoose";

let connected = false;

const connectDB = async () => {
  mongoose.set("strictQuery", true);

  // Cek readyState asli (1 = connected), BUKAN cuma flag boolean lokal —
  // di serverless/hot-reload, koneksi bisa drop di background (mis. idle
  // timeout Atlas) sementara flag `connected` masih `true` dari request
  // sebelumnya, bikin query berikutnya diam-diam jalan ke koneksi mati.
  // Ini salah satu penyebab authOptions.js::session() sesekali gagal
  // (lihat komentar di sana) yang berujung "judges logout sendiri".
  if (connected && mongoose.connection.readyState === 1) {
    console.log("✅ MongoDB sudah connect:", mongoose.connection.name);
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "sustainabledb_atlas",
      // BUG FIX (2026-09-23): sebelumnya tidak ada timeout eksplisit sama
      // sekali — default driver MongoDB (serverSelectionTimeoutMS 30000ms)
      // bikin request submit penalty juri bisa "menggantung" sampai 30
      // detik tanpa feedback apa pun kalau Atlas lambat/tidak terjangkau,
      // sebelum akhirnya gagal. Dipersingkat supaya kegagalan koneksi
      // cepat terdeteksi & bisa direspons ke juri (lihat
      // isDbConnectionError() di bawah + penanganannya di
      // judge-reports/detail/route.js).
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 15000,
    });

    console.log("✅ MongoDB CONNECTED");
    console.log("🗄️ Database name:", conn.connection.name);
    console.log("🌐 Host:", conn.connection.host);

    connected = true;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    connected = false;
    // BUG FIX (2026-09-23): sebelumnya error ini DITELAN di sini (cuma
    // di-log, tidak di-throw) — pemanggil (semua API route) tidak pernah
    // tahu koneksi gagal, lalu tetap menjalankan query Mongoose berikutnya
    // ke koneksi yang TIDAK ADA. Mongoose akan mem-buffer command itu
    // sampai `bufferTimeoutMS` (default 10 detik) baru gagal dgn pesan
    // teknis generik ("buffering timed out"), BUKAN pesan yang jelas utk
    // juri. Sekarang di-throw supaya route pemanggil bisa tangani secara
    // eksplisit & cepat.
    throw err;
  }
};

// Deteksi error koneksi/timeout MongoDB (server tidak terjangkau, DNS
// gagal, atau buffering command timeout krn tidak pernah benar-benar
// connect) — dipakai route yang butuh membedakan "database bermasalah"
// dari error aplikasi biasa, supaya bisa kasih pesan & status HTTP yang
// tepat (503) ke client, bukan 500 generik.
export function isDbConnectionError(err) {
  if (!err) return false;
  const name = String(err.name || "");
  const msg = String(err.message || "").toLowerCase();
  return (
    name === "MongoServerSelectionError" ||
    name === "MongooseServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoTimeoutError" ||
    msg.includes("buffering timed out") ||
    msg.includes("server selection timed out") ||
    msg.includes("connect etimedout") ||
    msg.includes("connection timed out") ||
    msg.includes("topology was destroyed")
  );
}

export default connectDB;
