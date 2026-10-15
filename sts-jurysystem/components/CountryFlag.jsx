import { flagUrl } from "@/utils/countryFlag";

// Bendera kecil dari teks Nationality ("Indonesia", "INA", "MAS", …).
// Negara tak dikenal -> kode/teks singkat sbg pengganti, supaya tetap ada
// penanda negara. Nama negara lengkap muncul sbg tooltip.
export default function CountryFlag({ nationality, size = "sm", className = "" }) {
  const n = String(nationality || "").trim();
  if (!n) return null;
  const url = flagUrl(n, 40);
  const box = size === "lg" ? "w-7 h-5" : size === "md" ? "w-6 h-4" : "w-5 h-3.5";
  if (!url) {
    return (
      <span
        title={n}
        className={`inline-flex flex-none items-center justify-center rounded-[3px] bg-gray-200 text-gray-600 text-[8px] font-bold px-1 ${size === "lg" ? "h-5" : "h-3.5"} ${className}`}
      >
        {n.slice(0, 3).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={n}
      title={n}
      loading="lazy"
      className={`inline-block flex-none ${box} rounded-[3px] object-cover ring-1 ring-black/10 ${className}`}
    />
  );
}
