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
    });

    console.log("✅ MongoDB CONNECTED");
    console.log("🗄️ Database name:", conn.connection.name);
    console.log("🌐 Host:", conn.connection.host);

    connected = true;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    connected = false;
  }
};

export default connectDB;
