import mongoose from "mongoose";

let connected = false;

const connectDB = async () => {
  mongoose.set("strictQuery", true);

  if (connected) {
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
  }
};

export default connectDB;
