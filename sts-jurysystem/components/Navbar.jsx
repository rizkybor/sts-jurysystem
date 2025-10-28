"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/images/logo-white.png";
import profileDefault from "@/assets/images/profile.png";
import { FaGoogle } from "react-icons/fa";
import { signIn, signOut, useSession, getProviders } from "next-auth/react";
import UnreadMessageCount from "./UnreadMessageCount";

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

  return (
    <nav className="surface-sts border-b border-white">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-20 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center md:hidden">
            {/* <!-- Mobile menu button--> */}
            <button
              type="button"
              id="mobile-dropdown-button"
              className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:btnActive-sts hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            >
              <span className="absolute -inset-0.5"></span>
              <span className="sr-only">Open main menu</span>
              <svg
                className="block h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          </div>

          <div className="flex flex-1 items-center justify-center md:items-stretch md:justify-start">
            {/* <!-- Logo --> */}
            <Link className="flex flex-shrink-0 items-center" href="/">
              <Image
                className="h-10 w-auto mr-2"
                src={logo}
                alt="PropertyPulse"
              />

              <div>
                <span className="hidden md:block font-title text-white">
                  STiming System
                </span>
                <span className="hidden md:block font-tiny text-white">
                  Profesional Timing System
                </span>
              </div>
            </Link>
            {/* <!-- Desktop Menu Hidden below md screens --> */}
            <div className="hidden md:ml-6 md:block">
              <div className="flex space-x-2">
                <Link
                  href="/"
                  className={`${
                    pathname === "/" ? "btnActive-sts" : ""
                  } text-white hover:btnActive-sts hover:text-white rounded-md px-3 py-2`}
                >
                  Home
                </Link>
                {/* <Link
                  href='/properties'
                  className={`${
                    pathname === '/properties' ? 'bg-black' : ''
                  } text-white hover:bg-gray-900 hover:text-white rounded-md px-3 py-2`}
                >
                  Properties
                </Link> */}

                <Link
                  href="/matches"
                  className={`${
                    pathname === "/matches" ? "btnActive-sts" : ""
                  } text-white hover:btnActive-sts hover:text-white rounded-md px-3 py-2`}
                >
                  Events
                </Link>

                <Link
                  href="/live"
                  className={`${
                    pathname === "/live" ? "btnActive-sts" : ""
                  } text-white hover:btnActive-sts hover:text-white rounded-md px-3 py-2`}
                >
                  Live Result
                </Link>
                {/* {session && (
                  <Link
                    href="/judges"
                    className={`${
                      pathname === "/judges" ? "btnActive-sts" : ""
                    } text-white hover:btnActive-sts hover:text-white rounded-md px-3 py-2`}
                  >
                    Judges
                  </Link>
                )} */}
              </div>
            </div>
          </div>

          {/* <!-- Right Side Menu (Logged Out) --> */}
          {!session && (
            <div className="hidden md:block md:ml-6">
              <div className="flex items-center">
                <button
                  onClick={() => signIn("google")}
                  className="
          flex items-center justify-center gap-2
          bg-white border border-gray-300 text-gray-700 
          rounded-md px-4 py-2
         hover:bg-gray-300 hover:shadow-lg
    transition duration-200 ease-in-out
        "
                >
                  {/* <FaGoogle className="text-red-500 text-lg" />
                  <span className="font-medium">Login with Google</span> */}
                  {/* Logo G warna asli */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    width="22px"
                    height="22px"
                  >
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

                  <span className="text-gray-700 font-medium">
                    Sign in with Google
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* <!-- Right Side Menu (Logged In) --> */}
          {session && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 md:static md:inset-auto md:ml-6 md:pr-0">
              {/* <!-- Profile dropdown button --> */}
              <div className="relative mr-3">
                {/* Profile trigger */}
                <div>
                  <button
                    type="button"
                    id="user-menu-button"
                    aria-expanded={isProfileMenuOpen}
                    aria-haspopup="true"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="
      group flex items-center gap-3
      rounded-2xl bg-white/15 backdrop-blur-md
      px-3 py-2 pr-4
      shadow-sm ring-1 ring-white/20
      hover:bg-white/25 hover:shadow
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60
      transition
      text-left
    "
                  >
                    <Image
                      className="h-9 w-9 rounded-full ring-2 ring-white/50"
                      src={profileImage || profileDefault}
                      alt="User avatar"
                      width={36}
                      height={36}
                    />

                    {/* tampil hanya di desktop */}
                    <div className="hidden md:flex flex-col leading-tight">
                      <span className="text-white font-semibold text-base">
                        {displayName || "Undefined"}
                      </span>
                      <span className="text-white/80 text-sm">{"Judge"}</span>
                    </div>
                  </button>
                </div>

                {/* <!-- Profile dropdown --> */}
                {isProfileMenuOpen && (
                  <div
                    id="user-menu"
                    className="absolute right-0 z-10 mt-2 w-52 origin-top-right rounded-xl bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                    tabIndex="-1"
                  >
                    <div className="py-1">
                      {/* Mobile-only Notification item */}
                      <Link
                        href="/messages"
                        className="md:hidden block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-sts active:bg-gray-200 active:scale-[0.98] transition-all duration-150 ease-in-out rounded-t-md"
                        role="menuitem"
                        tabIndex="-1"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        Notifications
                      </Link>

                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-sts active:bg-gray-200 active:scale-[0.98] transition-all duration-150 ease-in-out"
                        role="menuitem"
                        tabIndex="-1"
                        id="user-menu-item-0"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                        }}
                      >
                        My Profile
                      </Link>

                      <Link
                        href="/judges"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-sts active:bg-gray-200 active:scale-[0.98] transition-all duration-150 ease-in-out"
                        role="menuitem"
                        tabIndex="-1"
                        id="user-menu-item-2"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                        }}
                      >
                        Judges Task
                      </Link>

                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          signOut({ callbackUrl: "/" });
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 active:bg-red-100 active:scale-[0.98] transition-all duration-150 ease-in-out rounded-b-md"
                        role="menuitem"
                        tabIndex="-1"
                        id="user-menu-item-3"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Link href="/messages" className="relative group hidden md:block">
                <button
                  type="button"
                  className="relative rounded-full btnHover-sts p-1 text-gray-400 hover:text-white hover:btnActive-sts focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  <span className="absolute -inset-1.5"></span>
                  <span className="sr-only">View notifications</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="white"
                    className="h-6 w-6 m-1"
                    aria-hidden="true"
                  >
                    <path d="M12 24a2.4 2.4 0 0 0 2.4-2.4h-4.8A2.4 2.4 0 0 0 12 24zM18 16v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 1 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                  </svg>
                </button>
                <UnreadMessageCount session={session} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* <!-- Mobile menu, show/hide based on menu state. --> */}
      {isMobileMenuOpen && (
        <div id="mobile-menu">
          <div className="space-y-1 px-2 pb-3 pt-2">
            <Link
              href="/"
              className={`${
                pathname === "/" ? "btnActive-sts" : ""
              } text-white hover:btnActive-sts block rounded-md px-3 py-2 text-base font-medium`}
            >
              Home
            </Link>
            {/* <Link
              href="/properties"
              className={`${
                pathname === "/properties" ? "bg-black" : ""
              } text-white block rounded-md px-3 py-2 text-base font-medium`}
            >
              Properties
            </Link> */}
            <Link
              href="/matches"
              className={`${
                pathname === "/matches" ? "btnActive-sts" : ""
              } text-white hover:btnActive-sts block rounded-md px-3 py-2 text-base font-medium`}
            >
              Events
            </Link>

            <Link
              href="/live"
              className={`${
                pathname === "/live" ? "btnActive-sts" : ""
              } text-white hover:btnActive-sts block rounded-md px-3 py-2 text-base font-medium`}
            >
              Live Result
            </Link>
            {/* {session && (
              <Link
                href="/judges"
                className={`${
                  pathname === "/judges" ? "bg-black" : ""
                } text-white hover:bg-gray-900 hover:text-white rounded-md px-3 py-2`}
              >
                Judges
              </Link>
            )} */}

            {!session &&
              providers &&
              Object.values(providers).map((provider, index) => (
                <button
                  key={index}
                  onClick={() => signIn(provider.id)}
                  className="
        flex items-center justify-center gap-2
        bg-white border border-gray-300 text-gray-700
        rounded-md px-4 py-2
        hover:bg-gray-200 hover:shadow-md
        transition duration-200 ease-in-out
      "
                >
                  {/* Optional: Tampilkan logo sesuai provider */}
                  {provider.name === "Google" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      width="22px"
                      height="22px"
                    >
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
                  )}

                  <span className="text-gray-700 font-medium">
                    Sign in with {provider.name}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </nav>
  );
};
export default Navbar;
