import connectDB from "@/config/database";
import ChatMessage from "@/models/ChatMessage";
import { getSessionUser } from "@/utils/getSessionUser";

export const dynamic = "force-dynamic";

/* DELETE /api/chat/:id — hapus (soft-delete) pesan milik sendiri, ala WhatsApp */
export const DELETE = async (req, { params }) => {
  try {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ success: false, message: "User not authenticated" }),
        { status: 401 }
      );
    }

    const { id } = await params;
    const message = await ChatMessage.findById(id);
    if (!message) {
      return new Response(
        JSON.stringify({ success: false, message: "Pesan tidak ditemukan" }),
        { status: 404 }
      );
    }

    if (message.senderEmail !== sessionUser.user.email) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Hanya bisa menghapus pesan sendiri",
        }),
        { status: 403 }
      );
    }

    if (!message.deleted) {
      message.deleted = true;
      message.text = "";
      message.attachment = null;
      await message.save();
    }

    return new Response(JSON.stringify({ success: true, data: message }), {
      status: 200,
    });
  } catch (err) {
    console.error("❌ Error deleting chat message:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Internal Server Error" }),
      { status: 500 }
    );
  }
};
