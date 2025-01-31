import connectDB from '@/config/database';
import JudgeReport from '@/models/JudgeReport';
import JudgeReportSprintDetail from '@/models/JudgeReportSprintDetail';
import { getSessionUser } from '@/utils/getSessionUser';

export const dynamic = 'force-dynamic';

// ✅ **GET: Ambil Sprint Reports**
export const GET = async () => {
    try {
      await connectDB();
  
      // Ambil semua data sprint
      const sprintResults = await JudgeReportSprintDetail.find().sort({ createdAt: -1 });
  
      return new Response(JSON.stringify({ success: true, data: sprintResults }), { status: 200 });
    } catch (error) {
      console.error("❌ Error fetching sprint results:", error);
      return new Response(JSON.stringify({ success: false, message: "Internal Server Error" }), { status: 500 });
    }
  };

// ✅ **POST: Tambah Sprint Report**
export const POST = async (req) => {
    try {
      await connectDB();
      
      const sessionUser = await getSessionUser();
      if (!sessionUser || !sessionUser.userId) {
        return new Response(JSON.stringify({ success: false, message: "User ID is required" }), { status: 401 });
      }
  
      const { position, team, penalty, eventId, juryId } = await req.json();
  
      if (!position || !team || penalty === null || !eventId || !juryId) {
        return new Response(JSON.stringify({ success: false, message: "Missing required fields" }), { status: 400 });
      }
  
      // ✅ **1️⃣ Cek apakah tim sudah memiliki posisi Start atau Finish**
      const existingReports = await JudgeReportSprintDetail.find({ team });
  
      const hasStart = existingReports.some(report => report.position === "Start");
      const hasFinish = existingReports.some(report => report.position === "Finish");
  
      // ✅ **2️⃣ Blokir jika tim sudah memiliki keduanya**
      if (hasStart && hasFinish) {
        return new Response(JSON.stringify({ success: false, message: `Team ${team} sudah memiliki Start dan Finish. Tidak bisa submit lagi.` }), { status: 400 });
      }
  
      // ✅ **3️⃣ Pastikan tim hanya bisa submit posisi yang belum ada**
      if ((position === "Start" && hasStart) || (position === "Finish" && hasFinish)) {
        return new Response(JSON.stringify({ success: false, message: `Team ${team} sudah memiliki posisi ${position}. Pilih posisi yang belum ada.` }), { status: 400 });
      }
  
      // ✅ **4️⃣ Simpan ke judgeReportSprintDetails**
      const sprintDetail = await JudgeReportSprintDetail.create({
        position,
        team,
        penalty,
        createdAt: new Date().toISOString()
      });
  
      if (!sprintDetail) {
        return new Response(JSON.stringify({ success: false, message: "Failed to create sprint detail" }), { status: 500 });
      }
  
      // ✅ **5️⃣ Cek apakah ada JudgeReport dengan eventId & juryId**
      let judgeReport = await JudgeReport.findOne({ eventId, juryId });
  
      if (judgeReport) {
        // ✅ Jika sudah ada, tambahkan sprintDetail ke reportSprint
        judgeReport.reportSprint.push(sprintDetail._id);
        await judgeReport.save();
      } else {
        // ✅ Jika tidak ada, buat JudgeReport baru
        judgeReport = await JudgeReport.create({
          eventId,
          juryId,
          createdBy: "Judges",
          reportSprint: [sprintDetail._id],
          reportHeadToHead: [],
          reportSlalom: [],
          reportDrr: [],
          createdAt: new Date().toISOString()
        });
      }
  
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Sprint report added successfully", 
        sprintDetail, 
        judgeReport 
      }), { status: 201 });
  
    } catch (error) {
      console.error("❌ Error saving sprint report:", error);
      return new Response(JSON.stringify({ success: false, message: "Internal Server Error" }), { status: 500 });
    }
  };