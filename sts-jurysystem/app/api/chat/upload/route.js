import cloudinary from "@/config/cloudinary";
import { getSessionUser } from "@/utils/getSessionUser";

export const dynamic = "force-dynamic";

// BUG FIX: kalau CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET tidak ke-set di
// environment production (beda dari .env lokal yang tidak pernah ikut
// ter-deploy — kejadian yang sama persis pernah terjadi pada
// NEXT_PUBLIC_SITE_URL), cloudinary.uploader.upload() akan throw error
// autentikasi ("Must supply api_key" dkk) yang SEBELUMNYA ketutup jadi
// pesan generik "Gagal upload file" oleh catch-all di bawah — operator
// tidak pernah tahu akar masalahnya cuma env var yang belum di-set.
// Deteksi dini di sini supaya pesannya jelas & actionable.
function assertCloudinaryConfigured() {
  const missing = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].filter(
    (k) => !process.env[k]
  );
  if (missing.length) {
    throw new Error(
      `Konfigurasi Cloudinary belum lengkap di environment ini — variable ${missing.join(
        ", "
      )} belum di-set. Cek Environment Variables di dashboard hosting (Vercel), bukan cuma file .env lokal.`
    );
  }
}

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image", "audio"];

export const POST = async (req) => {
  try {
    assertCloudinaryConfigured();
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
    // BUG FIX: `message` di sini sebelumnya SELALU string generik "Gagal
    // upload file" — client (JudgeChatWidget.jsx::uploadAttachment) cuma
    // menampilkan `data.message` ke user, jadi `err.message` (alasan
    // ASLI, mis. error autentikasi Cloudinary) tersembunyi di field
    // `error` yang tidak pernah dibaca UI. Pakai alasan asli kalau ada.
    return new Response(
      JSON.stringify({
        success: false,
        message: err?.message ? `Gagal upload file: ${err.message}` : "Gagal upload file",
        error: err.message,
      }),
      { status: 500 }
    );
  }
};
