"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import NavigationButton from "@/components/NavigationButton";
import getSocket from "@/utils/socket";

const JudgesPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // ====== TOAST RINGAN (tanpa library) ======
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(1);

  const pushToast = (msg, ttlMs = 4000) => {
    const id = toastId.current++;
    setToasts((prev) => [...prev, { id, ...msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ttlMs);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  // ==========================================

  // simpan instance + id socket
  const socketRef = useRef(null);
  const [socketId, setSocketId] = useState(null);

  // Socket listeners (HANYA tampilkan toast untuk pesan dari orang lain)
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => setSocketId(socket.id);

    const handler = (msg) => {
      if (
        msg?.senderId &&
        socketRef.current &&
        msg.senderId === socketRef.current.id
      )
        return;
      console.log("[Next] terima:", msg);
      pushToast({
        title: msg.from ? `Pesan dari ${msg.from}` : "Realtime Message",
        text: msg.text || "New message received",
      });
    };

    socket.on("connect", onConnect);
    socket.on("custom:event", handler);

    return () => {
      socket.off("connect", onConnect);
      socket.off("custom:event", handler);
    };
  }, []);

  const sendRealtimeMessage = () => {
    const socket = socketRef.current || getSocket();
    if (!socket) return;

    socket.emit(
      "custom:event",
      {
        senderId: socket.id,
        from: "Rizky Judges - Gates A || ",
        text: "Budi Luhur Team : Penalties 50",
        ts: new Date().toISOString(),
      },
      (ok) => {
        if (!ok) console.warn("Emit not acknowledged by server");
      }
    );
  };

  // Fetch Events
  useEffect(() => {
    const fetchEventsActive = async () => {
      try {
        const res = await fetch("/api/judges");
        if (res.status === 200) {
          const data = await res.json();
          setEvents(data);
        } else {
          console.log(res.statusText);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    fetchEventsActive();
  }, []);

  // Fetch User Data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/user");
        if (res.status === 200) {
          const data = await res.json();
          setUser(data);
        }
      } catch (error) {
        console.log("Error fetching user:", error);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUserData();
  }, []);

  // ===== Helper: cari entry judges per event =====
  const findJudgeEntry = (u, eventId) => {
    if (!u?.judges?.length || !eventId) return null;
    const eid = typeof eventId === "string" ? eventId : eventId?.toString?.();
    return (
      u.judges.find(
        (j) =>
          (typeof j.eventId === "string"
            ? j.eventId
            : j.eventId?.toString?.()) === eid
      ) || null
    );
  };

  // Konfigurasi tombol biar DRY
  const judgeButtonsConfig = useMemo(
    () => [
      {
        key: "judgesSprint",
        href: "/judges/sprint",
        label: "Sprint",
        icon: "🏎️",
        color: "bg-blue-500",
      },
      {
        key: "judgesHeadtoHead",
        href: "/judges/headtohead",
        label: "Head 2 Head",
        icon: "🤜🤛",
        color: "bg-green-500",
      },
      {
        key: "judgesSlalom",
        href: "/judges/slalom",
        label: "Slalom",
        icon: "🌀",
        color: "bg-purple-500",
      },
      {
        key: "judgesDRR",
        href: "/judges/downriverrace",
        label: "DRR",
        icon: "🚀",
        color: "bg-red-500",
      },
    ],
    []
  );

  return (
    <>
      {/* ====== TOAST CONTAINER (kanan atas) ====== */}
      <div className="pointer-events-none fixed top-4 right-4 z-[1000] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl ring-1 ring-black/5 transition-all duration-200 animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              <div className="flex-1">
                {t.title && (
                  <p className="text-sm font-semibold text-gray-900">
                    {t.title}
                  </p>
                )}
                <p className="text-sm text-gray-700">{t.text}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-6 text-center">
          Judges Dashboard
        </h1>

        {/* USER CARD — CENTER */}
        <div className="flex justify-center">
          {loadingUser ? (
            <p className="text-gray-500">Loading user data...</p>
          ) : user ? (
            <div className="flex flex-col items-center text-center mb-6 md:mb-8">
              {user.image && (
                <img
                  src={user.image}
                  alt={user.username}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full shadow-md mb-3 md:mb-4"
                />
              )}
              <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                {user.username}
              </h2>
              <p className="text-gray-600 text-sm md:text-base">{user.email}</p>
              <p className="text-gray-500 text-xs md:text-sm">
                Joined on {new Date(user.createdAt).toLocaleDateString()}
              </p>

              {/* BUTTON KIRIM PESAN — CENTER */}
              <div className="flex justify-center mt-5 mb-6 md:mb-8">
                <button
                  className="px-4 md:px-5 py-2 md:py-2.5 rounded bg-blue-600 text-white shadow hover:shadow-md transition text-sm md:text-base"
                  onClick={sendRealtimeMessage}
                >
                  Kirim Pesan ke Operator Timing
                </button>
              </div>
            </div>
          ) : (
            <p className="text-red-500">User not found.</p>
          )}
        </div>

        {/* 🚀 DAFTAR EVENTS */}
        {loading ? (
          <p className="text-gray-500 text-center">Loading events...</p>
        ) : events.length > 0 ? (
          <div className="space-y-6 md:space-y-8">
            {events.map((event) => {
              const perEventJudge = user
                ? findJudgeEntry(user, event._id)
                : null;

              const banner =
                event.eventBanner &&
                typeof event.eventBanner === "string" &&
                event.eventBanner.trim() !== ""
                  ? event.eventBanner
                  : "/images/logo-dummy.png"; // fallback: pastikan ada di /public/images

              return (
                <div
                  key={event._id}
                  className="relative rounded-xl border border-gray-200 bg-white p-4 md:p-6 shadow-lg"
                >
                  {/* BUTTON HISTORY: full width di mobile, kanan atas di md+ */}
                  <div className="mb-3 md:mb-4 flex md:justify-end">
                    <button
                      onClick={() =>
                        console.log("Lihat history untuk event:", event._id)
                      }
                      className="w-full md:w-auto px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200 shadow"
                    >
                      📜 History
                    </button>
                  </div>

                  {/* GRID UTAMA: gambar + konten */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
                    {/* Banner kiri */}
                    <div className="md:col-span-5">
                      <img
                        src={banner}
                        alt={event.eventName}
                        className="w-full h-48 md:h-56 lg:h-64 object-cover rounded-lg shadow"
                      />
                    </div>

                    {/* Konten kanan */}
                    <div className="md:col-span-7">
                      <h2 className="text-xl md:text-2xl font-bold text-blue-600 mb-2">
                        {event.eventName}
                      </h2>

                      <p className="text-gray-700 text-sm md:text-base mb-3 md:mb-4">
                        {event.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-600 text-sm md:text-base mb-1.5 md:mb-2">
                        <p>
                          <strong>River:</strong> {event.riverName}
                        </p>
                        <span className="hidden md:inline">|</span>
                        <p>
                          <strong>Level:</strong> {event.levelName}
                        </p>
                      </div>

                      <p
                        className={`font-semibold text-sm md:text-base ${
                          event.statusEvent === "Activated"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        Status: {event.statusEvent}
                      </p>
                    </div>
                  </div>

                  {/* 🔘 BUTTON NAVIGASI PER-EVENT — RESPONSIF */}
                  {user ? (
                    perEventJudge ? (
                      <div className="mt-4 md:mt-6">
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                          {judgeButtonsConfig.map((btn) => {
                            const val = perEventJudge[btn.key];
                            if (typeof val === "string" && val.trim() === "")
                              return null;
                            if (val == null) return null;

                            return (
                              <NavigationButton
                                key={btn.key}
                                href={btn.href}
                                label={`${btn.label}${val ? ` (${val})` : ""}`}
                                icon={btn.icon}
                                color={btn.color}
                                params={{
                                  eventId: event._id,
                                  userId: user?._id,
                                }}
                                className="w-full py-2.5 md:py-3 min-h-[48px] md:min-h-[56px] text-sm md:text-base"
                              />
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs md:text-sm text-amber-600">
                        Tidak ada otorisasi juri untuk event ini pada akun Anda.
                      </p>
                    )
                  ) : (
                    <p className="mt-3 text-xs md:text-sm text-amber-600">
                      User belum termuat. Tombol navigasi akan muncul setelah
                      data user tersedia.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center">No events available.</p>
        )}
      </div>
    </>
  );
};

export default JudgesPage;
