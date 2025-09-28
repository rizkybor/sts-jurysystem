/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"], // font default
        title: ["Poppins", "ui-sans-serif", "system-ui"], // font untuk judul
        desc: ["Roboto", "ui-sans-serif", "system-ui"], // font deskripsi
        mono: ["Fira Code", "ui-monospace", "SFMono-Regular"], // monospace (kode)
      },
      gridTemplateColumns: {
        "70/30": "70% 28%",
      },
    },
  },
  plugins: [],
};
