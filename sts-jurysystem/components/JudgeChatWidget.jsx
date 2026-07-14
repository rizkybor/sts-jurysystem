"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import getSocket from "@/utils/socket";
import { useGlobalContext } from "@/context/GlobalContext";

const CATEGORY_LABELS = {
  sprint: "Sprint",
  h2h: "Head To Head",
  slalom: "Slalom",
  drr: "DRR",
  rx: "Rafting Cross",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_RECORD_SECONDS = 120; // jaring pengaman ukuran file

const AUDIO_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickSupportedAudioMime() {
  if (typeof MediaRecorder === "undefined") return null;
  return (
    AUDIO_MIME_CANDIDATES.find(
      (m) => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(m)
    ) || null
  );
}

function formatDuration(totalSeconds) {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.round(totalSeconds)) : 0;
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const AVATAR_PALETTE = [
  "#1874a5",
  "#148a3b",
  "#a5581a",
  "#7c3aed",
  "#d9534f",
  "#0d9488",
  "#be185d",
  "#4b5563",
];

function initials(name) {
  const clean = (name || "").trim();
  if (!clean) return "?";
  return (
    clean
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

function avatarColor(name) {
  const str = name || "";
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

// Player pesan suara custom (pengganti <audio controls> bawaan browser yang
// tampilannya tidak konsisten antar platform).
function VoiceMessage({ url, duration, isSelf }) {
  const audioElRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);

  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onLoaded = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setTotalDuration(el.duration);
      }
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const el = audioElRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().catch(() => {});
      setPlaying(true);
    }
  };

  const progress = totalDuration > 0 ? Math.min(1, currentTime / totalDuration) : 0;
  const label = currentTime > 0 ? currentTime : totalDuration;

  return (
    <div
      className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 mb-1 min-w-[190px] ${
        isSelf ? "bg-white/15" : "bg-gray-100"
      }`}
    >
      <audio ref={audioElRef} src={url} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center transition ${
          isSelf ? "bg-white text-blue-600" : "bg-blue-500 text-white"
        }`}
        aria-label={playing ? "Jeda" : "Putar"}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 ml-0.5">
            <path d="M8 5v14l11-7L8 5Z" />
          </svg>
        )}
      </button>
      <div
        className={`flex-1 h-1 rounded-full overflow-hidden ${
          isSelf ? "bg-white/30" : "bg-gray-300"
        }`}
      >
        <div
          className={`h-full rounded-full ${isSelf ? "bg-white" : "bg-blue-500"}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span
        className={`text-[10px] tabular-nums flex-shrink-0 ${
          isSelf ? "text-white/80" : "text-gray-500"
        }`}
      >
        {formatDuration(label)}
      </span>
    </div>
  );
}

const JudgeChatWidget = ({ eventId, category }) => {
  const { unreadCount, setUnreadCount } = useGlobalContext();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [selfEmail, setSelfEmail] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const categoryLabel = CATEGORY_LABELS[category] || category;

  const enabled = Boolean(eventId && category && CATEGORY_LABELS[category]);

  // Browser (terutama Chrome/Safari) memblokir Audio.play() yang dipicu
  // tanpa gesture user (mis. dari event socket). Sekali user klik tombol
  // chat, "unlock" audio dengan play+pause instan supaya play() berikutnya
  // yang dipicu dari socket/polling tidak lagi diblokir diam-diam.
  const unlockAudio = () => {
    if (audioUnlockedRef.current || !audioRef.current) return;
    audioUnlockedRef.current = true;
    const el = audioRef.current;
    el.muted = true;
    el.play()
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = false;
      })
      .catch(() => {
        el.muted = false;
      });
  };

  const playTone = () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      el.currentTime = 0;
      el.play().catch(() => {});
    } catch {
      // gagal play audio bukan fatal
    }
  };

  const showUploadError = (msg) => {
    setUploadError(msg);
    setTimeout(() => setUploadError(null), 4000);
  };

  // Ambil identitas juri (untuk bubble "milik sendiri")
  useEffect(() => {
    if (!enabled) return;
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/judges", { cache: "no-store" });
        const data = await res.json();
        if (data?.user?.email) setSelfEmail(data.user.email);
      } catch {
        // abaikan
      }
    };
    fetchUser();
  }, [enabled]);

  // Riwayat chat saat panel dibuka, lalu poll ringan selama panel terbuka
  // sebagai jaring pengaman kalau koneksi socket sempat putus/gagal —
  // supaya pesan tetap masuk tanpa harus refresh halaman.
  useEffect(() => {
    if (!enabled || !isOpen) return;

    const fetchHistory = async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch(
          `/api/chat?eventId=${encodeURIComponent(
            eventId
          )}&category=${encodeURIComponent(category)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data?.success) {
          setMessages((prev) => {
            const incoming = data.data || [];
            if (!silent) return incoming;
            // saat polling diam-diam, cuma gabungkan pesan baru (hindari
            // menimpa state lokal yg mungkin lebih baru dari optimistic update)
            const known = new Set(prev.map((m) => m._id));
            const additions = incoming.filter((m) => !known.has(m._id));
            if (
              additions.length &&
              additions.some((m) => m.senderEmail !== selfEmail)
            ) {
              playTone();
            }
            return additions.length ? [...prev, ...additions] : prev;
          });
        }
      } catch {
        // abaikan
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchHistory();
    const poll = setInterval(() => fetchHistory({ silent: true }), 7000);
    return () => clearInterval(poll);
  }, [enabled, isOpen, eventId, category, selfEmail]);

  // Socket: terima pesan realtime
  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    socketRef.current = socket;

    const handler = (msg) => {
      if (!msg) return;
      if (String(msg.eventId || "") !== String(eventId)) return;
      if (String(msg.category || "") !== String(category)) return;

      if (msg.type === "chat:deleted") {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === msg._id
              ? { ...m, deleted: true, text: "", attachment: null }
              : m
          )
        );
        return;
      }

      if (msg.type !== "chat") return;
      if (msg.senderId && socket.id && msg.senderId === socket.id) return;

      setMessages((prev) => {
        if (msg._id && prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });

      setIsOpen((currentlyOpen) => {
        if (!currentlyOpen) {
          setUnreadCount((c) => (c || 0) + 1);
        }
        return currentlyOpen;
      });

      playTone();
    };

    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
  }, [enabled, eventId, category, setUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages.length, setUnreadCount]);

  // Lepas mic/timer kalau widget di-unmount saat masih merekam
  useEffect(() => {
    return () => {
      clearInterval(recordTimerRef.current);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const sendChatMessage = async ({ text: msgText = "", attachment = null }) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, category, text: msgText, attachment }),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      showUploadError(data?.message || "Gagal mengirim pesan");
      return false;
    }

    const saved = data.data;
    setMessages((prev) => [...prev, saved]);

    const socket = socketRef.current || getSocket();
    socket.emit("custom:event", {
      type: "chat",
      eventId,
      category,
      senderId: socket.id,
      senderEmail: saved.senderEmail,
      senderName: saved.senderName,
      text: saved.text,
      attachment: saved.attachment,
      _id: saved._id,
      createdAt: saved.createdAt,
    });
    return true;
  };

  const handleDeleteMessage = async (id) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/chat/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        showUploadError(data?.message || "Gagal menghapus pesan");
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m._id === id ? { ...m, deleted: true, text: "", attachment: null } : m
        )
      );

      const socket = socketRef.current || getSocket();
      socket.emit("custom:event", {
        type: "chat:deleted",
        eventId,
        category,
        senderId: socket.id,
        _id: id,
      });
    } catch {
      showUploadError("Gagal menghapus pesan");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const ok = await sendChatMessage({ text: trimmed });
      if (ok) setText("");
    } catch {
      showUploadError("Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  };

  const uploadAttachment = async (fileOrBlob, type, extra = {}) => {
    const form = new FormData();
    const filename =
      type === "audio" ? `voice-note.${extra.ext || "webm"}` : fileOrBlob.name;
    form.append("file", fileOrBlob, filename);
    form.append("type", type);
    if (extra.duration != null) form.append("duration", String(extra.duration));

    const res = await fetch("/api/chat/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      showUploadError(data?.message || "Gagal upload file");
      return null;
    }
    return data.attachment;
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // biar bisa pilih file yang sama lagi
    if (!file) return;

    if (file.size > MAX_BYTES) {
      showUploadError("Ukuran gambar maksimal 5MB");
      return;
    }

    setUploading(true);
    try {
      const attachment = await uploadAttachment(file, "image");
      if (attachment) await sendChatMessage({ attachment });
    } catch {
      showUploadError("Gagal upload gambar");
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    if (recording || uploading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = pickSupportedAudioMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recordedChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_RECORD_SECONDS) stopRecording();
          return next;
        });
      }, 1000);
    } catch {
      showUploadError("Tidak bisa mengakses mikrofon");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    clearInterval(recordTimerRef.current);
    const durationSec = recordSeconds;

    recorder.addEventListener(
      "stop",
      async () => {
        setRecording(false);

        const blob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        recordedChunksRef.current = [];

        if (!blob.size) return;
        if (blob.size > MAX_BYTES) {
          showUploadError("Rekaman terlalu besar (maks 5MB), coba lebih pendek");
          return;
        }

        setUploading(true);
        try {
          const ext = (recorder.mimeType || "").includes("mp4") ? "mp4" : "webm";
          const attachment = await uploadAttachment(blob, "audio", {
            ext,
            duration: durationSec,
          });
          if (attachment) await sendChatMessage({ attachment });
        } catch {
          showUploadError("Gagal upload suara");
        } finally {
          setUploading(false);
        }
      },
      { once: true }
    );

    recorder.stop();
  };

  if (!enabled) return null;

  return (
    <>
      {/* Elemen audio tersembunyi, di-"unlock" saat interaksi pertama supaya
          play() yang dipicu socket/polling berikutnya tidak diblokir browser */}
      <audio ref={audioRef} src="/sounds/tone_message.mp3" preload="auto" />

      {/* Floating button */}
      <button
        type="button"
        onClick={() => {
          unlockAudio();
          setIsOpen((prev) => !prev);
        }}
        className="fixed right-6 z-40 w-14 h-14 rounded-full btnActive-sts text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        aria-label="Buka chat"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-6 h-6"
        >
          <path d="M2 4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8l-5 4v-4H4a2 2 0 0 1-2-2V4Z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="fixed right-6 z-40 w-[90vw] max-w-sm sm:max-w-md h-[70vh] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
            style={{ bottom: "calc(6rem + env(safe-area-inset-bottom))" }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between btnActive-sts text-white">
              <div>
                <p className="font-semibold text-sm">Chat Operator Stiming System 424</p>
                <p className="text-xs opacity-90">{categoryLabel}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-white/20"
                aria-label="Tutup chat"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
              {loading ? (
                <p className="text-center text-sm text-gray-500 py-6">
                  Memuat pesan…
                </p>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-6">
                  Belum ada pesan.
                </p>
              ) : (
                messages.map((m, idx) => {
                  const isSelf = selfEmail && m.senderEmail === selfEmail;
                  return (
                    <div
                      key={m._id || idx}
                      className={`flex items-end gap-2 ${
                        isSelf ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isSelf && (
                        <div
                          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
                          style={{ background: avatarColor(m.senderName) }}
                        >
                          {initials(m.senderName)}
                        </div>
                      )}
                      <div className={`group relative max-w-[75%] ${isSelf ? "" : ""}`}>
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${
                            isSelf
                              ? "bg-blue-500 text-white rounded-br-sm"
                              : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                          } ${m.deleted ? "opacity-70" : ""}`}
                        >
                          {!isSelf && !m.deleted && (
                            <p className="text-xs font-semibold mb-0.5 opacity-80">
                              {m.senderName}
                            </p>
                          )}

                          {m.deleted ? (
                            <p
                              className={`flex items-center gap-1.5 italic text-xs ${
                                isSelf ? "text-white/80" : "text-gray-500"
                              }`}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                                <path d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7Zm3-3h6l1 2h4v2H4V6h4l1-2Z" opacity="0.6" />
                              </svg>
                              Pesan telah dihapus
                            </p>
                          ) : (
                            <>
                              {m.attachment?.type === "image" && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(m.attachment.url)}
                                  className="block mb-1 rounded-xl overflow-hidden ring-1 ring-black/5"
                                >
                                  <img
                                    src={m.attachment.url}
                                    alt="Gambar"
                                    className="w-full max-h-60 object-cover hover:opacity-90 transition"
                                  />
                                </button>
                              )}
                              {m.attachment?.type === "audio" && (
                                <VoiceMessage
                                  url={m.attachment.url}
                                  duration={m.attachment.duration}
                                  isSelf={isSelf}
                                />
                              )}
                              {m.text && (
                                <p className="whitespace-pre-wrap break-words">
                                  {m.text}
                                </p>
                              )}
                            </>
                          )}

                          <p
                            className={`text-[10px] mt-1 ${
                              isSelf ? "text-white/70" : "text-gray-400"
                            }`}
                          >
                            {m.createdAt
                              ? new Date(m.createdAt).toLocaleTimeString(
                                  "id-ID",
                                  { hour: "2-digit", minute: "2-digit" }
                                )
                              : ""}
                          </p>
                        </div>

                        {isSelf && !m.deleted && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteId((cur) =>
                                cur === m._id ? null : m._id
                              )
                            }
                            className="absolute -left-7 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition opacity-70 hover:opacity-100"
                            aria-label="Hapus pesan"
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                              <path d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7Zm3-3h6l1 2h4v2H4V6h4l1-2Z" />
                            </svg>
                          </button>
                        )}

                        {confirmDeleteId === m._id && (
                          <div
                            className={`mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 shadow-md text-xs ${
                              isSelf ? "ml-auto" : ""
                            }`}
                          >
                            <span className="text-gray-600">Hapus pesan ini?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(m._id)}
                              disabled={deletingId === m._id}
                              className="px-2 py-0.5 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50"
                            >
                              {deletingId === m._id ? "…" : "Ya"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium hover:bg-gray-200"
                            >
                              Batal
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Error upload / rekam */}
            <AnimatePresence>
              {uploadError && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3 py-1.5 bg-red-50 border-t border-red-100 text-red-600 text-xs flex items-center gap-1.5 overflow-hidden"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                    <path d="M12 2 1 21h22L12 2Zm0 6a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1Zm0 9.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
                  </svg>
                  {uploadError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Indikator rekam */}
            {recording && (
              <div className="px-3 py-1.5 bg-red-50 border-t border-red-100 text-red-600 text-xs font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Merekam… {formatDuration(recordSeconds)}
              </div>
            )}

            {/* Composer */}
            <form
              onSubmit={handleSend}
              className="p-3 border-t flex items-center gap-1.5 bg-white"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || uploading || recording}
                className="w-9 h-9 flex-shrink-0 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-40 flex items-center justify-center transition"
                aria-label="Kirim gambar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4Zm0 2h16v8.59l-3.3-3.3a1 1 0 0 0-1.4 0L11 15.59l-2.3-2.3a1 1 0 0 0-1.4 0L4 16.59V6Zm4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={sending || uploading}
                className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition disabled:opacity-40 ${
                  recording
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                }`}
                aria-label={recording ? "Berhenti rekam" : "Rekam pesan suara"}
              >
                {recording ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
                    <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.93V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.07A7 7 0 0 0 19 11Z" />
                  </svg>
                )}
              </button>

              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={uploading ? "Mengunggah…" : "Tulis pesan…"}
                className="flex-1 px-3 py-2 border rounded-full text-base focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                disabled={sending || uploading || recording}
              />
              <button
                type="submit"
                disabled={sending || uploading || recording || !text.trim()}
                className="w-10 h-10 flex-shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white flex items-center justify-center transition"
                aria-label="Kirim"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M2.94 2.94a1.5 1.5 0 0 1 1.62-.34l16 6.5a1.5 1.5 0 0 1 0 2.8l-16 6.5a1.5 1.5 0 0 1-2.05-1.77L4.6 12 2.51 4.71a1.5 1.5 0 0 1 .43-1.77Z" />
                </svg>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox preview gambar */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
            onClick={() => setPreviewImage(null)}
          >
            <img
              src={previewImage}
              alt="Pratinjau"
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              aria-label="Tutup pratinjau"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default JudgeChatWidget;
