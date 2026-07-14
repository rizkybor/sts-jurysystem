import cloudinary from "@/config/cloudinary";
import { getSessionUser } from "@/utils/getSessionUser";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image", "audio"];

export const POST = async (req) => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ success: false, message: "User not authenticated" }),
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const type = (formData.get("type") || "").toString();
    const durationRaw = formData.get("duration");

    if (!file || typeof file === "string") {
      return new Response(
        JSON.stringify({ success: false, message: "File wajib diisi" }),
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "type harus 'image' atau 'audio'",
        }),
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Ukuran file maksimal 5MB",
        }),
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = file.type || (type === "audio" ? "audio/webm" : "image/jpeg");
    const dataUri = `data:${mimeType};base64,${base64}`;

    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: "sustainable-js/chat",
      resource_type: type === "audio" ? "video" : "image",
    });

    const duration = durationRaw ? Number(durationRaw) : null;

    return new Response(
      JSON.stringify({
        success: true,
        attachment: {
          type,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          format: uploadResult.format || "",
          bytes: uploadResult.bytes || file.size,
          duration: Number.isFinite(duration) ? duration : null,
        },
      }),
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error uploading chat attachment:", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Gagal upload file",
        error: err.message,
      }),
      { status: 500 }
    );
  }
};
