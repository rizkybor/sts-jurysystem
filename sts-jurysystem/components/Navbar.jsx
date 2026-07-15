"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/images/logo-white.png";
import profileDefault from "@/assets/images/profile.png";
import { signIn, signOut, useSession, getProviders } from "next-auth/react";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/matches" },
  { label: "Live Result", href: "/live" },
];

const GoogleGlyph = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.6 1.22 9.06 3.6l6.72-6.72C35.82 2.71 30.35 0 24 0 14.64 0 6.56 5.38 2.56 13.22l7.9 6.14C12.38 13.37 17.74 9.5 24 9.5z"
    />
    <path
      fill="#34A853"
      d="M46.98 24.55c0-1.56-.14-3.06-.4-4.5H24v8.52h12.94c-.56 2.88-2.22 5.32-4.7 6.96l7.24 5.63c4.24-3.9 6.7-9.64 6.7-16.61z"
    />
    <path
      fill="#4A90E2"
      d="M9.46 28.36c-.48-1.44-.76-2.96-.76-4.36s.27-2.92.76-4.36l-7.9-6.14C.93 16.9 0 20.35 0 24c0 3.65.93 7.1 2.56 10.5l6.9-6.14z"
    />
    <path
      fill="#FBBC05"
      d="M24 48c6.48 0 11.92-2.14 15.9-5.84l-7.24-5.63c-2.02 1.37-4.58 2.17-8.66 2.17-6.26 0-11.62-3.87-13.54-9.33l-7.9 6.14C6.56 42.62 14.64 48 24 48z"
    />
  </svg>
);

const Navbar = () => {
  const { data: session } = useSession();
  const profileImage = session?.user?.image;
  const displayName = session?.user?.name;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [providers, setProviders] = useState(null);

  const pathname = usePathname();

  useEffect(() => {
    const setAuthProviders = async () => {
      const res = await getProviders();
      setProviders(res);
    };

    setAuthProviders();
  }, []);

  // Tutup menu mobile otomatis saat pindah halaman
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <nav className="surface-sts sticky top-0 z-30 shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 sm:h-20 items-center justify-between">
          {/* Logo */}
          <Link className="flex flex-shrink-0 items-center gap-2" href="/">
            <Image className="h-8 sm:h-10 w-auto" src={logo} alt="STiming Scoring" />
            <div className="hidden sm:block leading-tight">
              <span className="block font-semibold text-white text-sm">
                STiming Scoring
              </span>
              <span className="block text-[11px] text-white/70">
                Professional Timing System
              </span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {NAV_LINKS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? "text-white bg-white/15"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute left-3.5 right-3.5 -bottom-[1px] h-0.5 rounded-full bg-white" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Logged out — desktop */}
            {!session && (
              <button
                onClick={() => signIn("google")}
                className="hidden md:flex items-center justify-center gap-2 bg-white border border-white/40 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <GoogleGlyph />
                Sign in with Google
              </button>
            )}

            {/* Logged in */}
            {session && (
              <>
                <Link href="/histories" className="hidden md:block relative group">
                  <button
                    type="button"
                    className="relative rounded-full p-2 text-white/85 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                    aria-label="Notifications"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path d="M12 24a2.4 2.4 0 0 0 2.4-2.4h-4.8A2.4 2.4 0 0 0 12 24zM18 16v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 1 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </svg>
                  </button>
                </Link>

                <div className="relative">
                  <button
                    type="button"
                    id="user-menu-button"
                    aria-expanded={isProfileMenuOpen}
                    aria-haspopup="true"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="group flex items-center gap-2.5 rounded-full sm:rounded-2xl bg-white/15 backdrop-blur-md pl-1 pr-1 sm:pr-3.5 py-1 shadow-sm ring-1 ring-white/20 hover:bg-white/25 hover:shadow transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    <Image
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded-full ring-2 ring-white/50"
                      src={profileImage || profileDefault}
                      alt="User avatar"
                      width={36}
                      height={36}
                    />
                    <div className="hidden sm:flex flex-col leading-tight text-left">
                      <span className="text-white font-semibold text-sm">
                        {displayName || "Undefined"}
                      </span>
                      <span className="text-white/75 text-xs">Judge</span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isProfileMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        id="user-menu"
                        className="absolute right-0 z-10 mt-2 w-52 origin-top-right rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5 divide-y divide-gray-100"
                        role="menu"
                      >
                        <div className="py-1">
                          <Link
                            href="/histories"
                            className="md:hidden block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-sts transition-colors"
                            role="menuitem"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            Notifications
                          </Link>
                          <Link
                            href="/profile"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-sts transition-colors"
                            role="menuitem"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            My Profile
                          </Link>
                          <Link
                            href="/judges"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-sts transition-colors"
                            role="menuitem"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            Judges Task
                          </Link>
                          <button
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              signOut({ callbackUrl: "/" });
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            role="menuitem"
                          >
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              id="mobile-dropdown-button"
              className="md:hidden relative inline-flex items-center justify-center rounded-lg p-2 text-white/85 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="block h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-white/15"
          >
            <div className="space-y-1 px-4 pb-4 pt-3">
              {NAV_LINKS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                      active
                        ? "bg-white/15 text-white"
                        : "text-white/85 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {!session &&
                providers &&
                Object.values(providers).map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => signIn(provider.id)}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-white border border-white/40 text-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:shadow-md transition-all duration-200"
                  >
                    {provider.name === "Google" && <GoogleGlyph />}
                    Sign in with {provider.name}
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
export default Navbar;
