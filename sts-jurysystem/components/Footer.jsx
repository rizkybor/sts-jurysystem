import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/images/logo-white.png";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/matches" },
  { label: "Live Result", href: "/live" },
];

const LEGAL_LINKS = [
  { label: "Syarat & Ketentuan", href: "/terms" },
  { label: "Kebijakan Privasi", href: "/privacy" },
  { label: "Kebijakan Cookie", href: "/cookies" },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-gradient-to-br from-sts via-stsDark to-stsDarkHiglight">
      <div className="pointer-events-none absolute -top-20 -left-16 w-64 h-64 rounded-full bg-stsHighlight/20 blur-[90px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 rounded-full bg-cyan-400/10 blur-[90px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-8 text-center sm:text-left">
          {/* Brand */}
          <div className="flex flex-col items-center sm:items-start lg:col-span-1">
            <Image src={logo} alt="STiming Scoring" className="h-9 w-auto mb-3" />
            <p className="text-sm text-white/70 leading-relaxed max-w-xs">
              Platform timing &amp; penjurian untuk event Whitewater Rafting
              Championship — akurat, transparan, real-time.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3.5">
              Navigasi
            </h3>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/85 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3.5">
              Perusahaan
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-white/85 hover:text-white transition-colors"
                >
                  Tentang Kami
                </Link>
              </li>
              <li>
                <a
                  href="https://jcdigital.co.id/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/85 hover:text-white transition-colors"
                >
                  PT. Jendela Cakra Digital
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3.5">
              Legal
            </h3>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/85 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 sm:mt-12 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 text-center">
          <p className="text-xs text-white/60">
            &copy;{currentYear} STiming Scoring — All rights
            reserved.
          </p>
          <p className="text-xs text-white/60">
             Concept Platform by{" "}
            <a
              href="https://jcdigital.co.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition-colors"
            >
              PT. Jendela Cakra Digital
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
