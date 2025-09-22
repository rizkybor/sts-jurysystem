"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import NavigationButton from "@/components/NavigationButton";
import getSocket from "@/utils/socket";

const JudgesPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); // State untuk data user
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
      // Jika pesan berasal dari diri sendiri, JANGAN tampilkan
      if (msg?.senderId && socketRef.current && msg.senderId === socketRef.current.id) {
        return;
      }
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

  // Kirim pesan TANPA menampilkan toast lokal
  const sendRealtimeMessage = () => {
    const socket = socketRef.current || getSocket();
    if (!socket) return;

    socket.emit(
      "custom:event",
      {
        senderId: socket.id, // penanda pengirim
        from: "Rizky Judges - Gates A || ",
        text: "Budi Luhur Team : Penalties 50",
        ts: new Date().toISOString(),
      },
      // optional ack (kalau mau tangani error saja)
      (ok) => {
        if (!ok) {
          // contoh: hanya tampilkan kalau gagal
          // pushToast({ title: "Gagal", text: "Pesan tidak terkirim." }, 3000);
          console.warn("Emit not acknowledged by server");
        }
      }
    );

    // >>> TIDAK ada pushToast “Terkirim” di sisi pengirim <<<
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
      {/* ========================================== */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">
          Events
        </h1>

        <button
          className="px-4 py-2 rounded bg-blue-600 text-white"
          onClick={sendRealtimeMessage}
        >
          Kirim Pesan ke Operator Timing
        </button>

        {/* 🚀 DAFTAR EVENTS */}
        {loading ? (
          <p className="text-gray-500 text-center">Loading events...</p>
        ) : events.length > 0 ? (
          <div className="space-y-12">
            {events.map((event) => (
              <div
                key={event._id}
                className="flex flex-col md:flex-row md:items-center gap-6 border-b border-gray-300 pb-8"
              >
                {event.images && event.images.length > 0 && (
                  <img
                    src={event.images[0]}
                    alt={event.eventName}
                    className="w-full md:w-1/3 h-64 object-cover rounded-lg"
                  />
                )}

                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-blue-600 mb-2">
                    {event.eventName}
                  </h2>

                  <p className="text-gray-700 mb-4">{event.description}</p>

                  {/* <p className="text-gray-600 mb-1">
                    <strong>Location:</strong> {event.location.street},{" "}
                    {event.location.city}, {event.location.state},{" "}
                    {event.location.zipcode}
                  </p> */}

                  <p className="text-gray-600 mb-1">
                    <strong>River:</strong> {event.riverName} |{" "}
                    <strong>Level:</strong> {event.levelName}
                  </p>

                  <p
                    className={`font-semibold ${
                      event.statusEvent === "Activated"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    Status: {event.statusEvent}
                  </p>
                </div>

                {/* 🚀 DATA USER */}
                {loadingUser ? (
                  <p className="text-gray-500 text-center">
                    Loading user data...
                  </p>
                ) : user ? (
                  <div className="flex flex-col items-center mb-10">
                    {/* Foto Profil */}
                    {user.image && (
                      <img
                        src={user.image}
                        alt={user.username}
                        className="w-24 h-24 rounded-full shadow-md mb-4"
                      />
                    )}

                    {/* Nama dan Email */}
                    <h2 className="text-xl font-semibold text-gray-800">
                      {user.username}
                    </h2>
                    <p className="text-gray-600">{user.email}</p>

                    {/* Tampilkan Tanggal Bergabung */}
                    <p className="text-gray-500 text-sm">
                      Joined on {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-red-500 text-center">User not found.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center">No events available.</p>
        )}
      </div>

      {/* 🚀 BUTTON NAVIGASI */}
      {events.length > 0 && user && (
        <div className="flex items-center justify-center py-10 px-4 sm:px-8 md:px-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-6xl">
            <NavigationButton
              href="/judges/sprint"
              label="Sprint"
              icon="🏎️"
              color="bg-blue-500"
              params={{ eventId: events[0]?._id, userId: user?._id }}
              className="w-full flex items-center justify-center py-4 min-h-[60px]"
            />

            <NavigationButton
              href="/judges/headtohead"
              label="Head 2 Head"
              icon="🤜🤛"
              color="bg-green-500"
              params={{ eventId: events[0]?._id, userId: user?._id }}
              className="w-full flex items-center justify-center py-4 min-h-[60px]"
            />

            <NavigationButton
              href="/judges/slalom"
              label="Slalom"
              icon="🌀"
              color="bg-purple-500"
              params={{ eventId: events[0]?._id, userId: user?._id }}
              className="w-full flex items-center justify-center py-4 min-h-[60px]"
            />

            <NavigationButton
              href="/judges/downriverrace"
              label="DRR"
              icon="🚀"
              color="bg-red-500"
              params={{ eventId: events[0]?._id, userId: user?._id }}
              className="w-full flex items-center justify-center py-4 min-h-[60px]"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default JudgesPage;
