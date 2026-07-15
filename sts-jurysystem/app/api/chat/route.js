import mongoose from "mongoose";
import connectDB from "@/config/database";
import ChatMessage from "@/models/ChatMessage";
import User from "@/models/User";
import { getSessionUser } from "@/utils/getSessionUser";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["sprint", "h2h", "slalom", "drr", "rx"];
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/* GET ?eventId=&category=&limit=&before= — riwayat chat, cursor pagination.
   Tanpa "before" -> batch pesan TERBARU (initial load). Dengan "before"
   (_id pesan paling lama yang sudah dimuat) -> batch yang lebih lama, buat
   infinite-scroll ke atas. _id dipakai sebagai cursor (bukan createdAt)
   karena ObjectId sudah monoton & unik per pesan, jadi tidak perlu
   tie-breaker tambahan untuk pesan yang createdAt-nya kebetulan sama persis. */
export const GET = async (req) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId") || undefined;
    const category = (searchParams.get("category") || "").toLowerCase();
    const before = searchParams.get("before") || null;
    const limitParam = parseInt(searchParams.get("limit") || "", 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

    if (!eventId || !VALID_CATEGORIES.includes(category)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "eventId dan category (valid) wajib diisi",
        }),
        { status: 400 }
      );
    }

    const query = { eventId, category };
    if (before) {
      if (!mongoose.Types.ObjectId.isValid(before)) {
        return new Response(
          JSON.stringify({ success: false, message: "Parameter before tidak valid" }),
          { status: 400 }
        );
      }
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const page = await ChatMessage.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .lean();
    const hasMore = page.length === limit;

    return new Response(
      JSON.stringify({ success: true, data: page.reverse(), hasMore }),
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
    const replyTo =
      body.replyTo && body.replyTo._id
        ? {
            _id: String(body.replyTo._id),
            senderEmail: String(body.replyTo.senderEmail || ""),
            senderName: String(body.replyTo.senderName || ""),
            text: String(body.replyTo.text || ""),
            attachmentType: ["image", "audio"].includes(body.replyTo.attachmentType)
              ? body.replyTo.attachmentType
              : null,
          }
        : null;

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
      replyTo,
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
