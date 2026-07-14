import connectDB from "@/config/database";
import ChatMessage from "@/models/ChatMessage";
import User from "@/models/User";
import { getSessionUser } from "@/utils/getSessionUser";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["sprint", "h2h", "slalom", "drr", "rx"];

/* GET ?eventId=&category= — riwayat chat, lama -> baru */
export const GET = async (req) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId") || undefined;
    const category = (searchParams.get("category") || "").toLowerCase();

    if (!eventId || !VALID_CATEGORIES.includes(category)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "eventId dan category (valid) wajib diisi",
        }),
        { status: 400 }
      );
    }

    const messages = await ChatMessage.find({ eventId, category })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return new Response(
      JSON.stringify({ success: true, data: messages.reverse() }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error fetching chat messages:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
};

/* POST { eventId, category, text } — simpan pesan baru */
export const POST = async (req) => {
  try {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ success: false, message: "User not authenticated" }),
        { status: 401 }
      );
    }

    const body = await req.json();
    const eventId = body.eventId;
    const category = (body.category || "").toLowerCase();
    const text = (body.text || "").trim();
    const attachment = body.attachment || null;

    if (!eventId || !VALID_CATEGORIES.includes(category)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "eventId dan category (valid) wajib diisi",
        }),
        { status: 400 }
      );
    }
    if (!text && !attachment) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "text atau attachment wajib diisi salah satu",
        }),
        { status: 400 }
      );
    }
    if (attachment && !["image", "audio"].includes(attachment.type)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "attachment.type harus 'image' atau 'audio'",
        }),
        { status: 400 }
      );
    }

    const user = await User.findById(sessionUser.userId).lean();
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { status: 404 }
      );
    }

    const message = await ChatMessage.create({
      eventId,
      category,
      senderEmail: user.email,
      senderName: user.username,
      text,
      attachment,
      createdAt: new Date(),
    });

    return new Response(JSON.stringify({ success: true, data: message }), {
      status: 201,
    });
  } catch (err) {
    console.error("❌ Error saving chat message:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
};
