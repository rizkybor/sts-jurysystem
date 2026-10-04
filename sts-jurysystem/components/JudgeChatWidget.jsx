"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import getSocket from "@/utils/socket";
import { useGlobalContext } from "@/context/GlobalContext";
import liveChatIcon from "@/assets/icon/live-chat.svg";
import useJudgeAssignments from "@/hooks/judges/useJudgeAssignments";
import {
  SUBMIT_FAILED_EVENT,
  GENERAL_SUGGESTIONS,
  getJudgeTasks,
  readLastSubmitFailure,
  clearLastSubmitFailure,
  buildFailureMessage,
  buildTaskTemplate,
} from "@/utils/judgeChatSuggestions";

const CATEGORY_LABELS = {
  sprint: "Sprint",
  h2h: "Head To Head",
  slalom: "Slalom",
  drr: "DRR",
  rx: "Rafting Cross",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const PAGE_SIZE = 25; // jumlah pesan per batch (initial load & load pesan lama)

// Selalu tampilkan Waktu Indonesia Barat (WIB), lepas dari timezone
// perangkat/browser yang dipakai membuka halaman ini.
function formatChatTime(createdAt) {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });
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

const JudgeChatWidget = ({ eventId, category }) => {
  const { unreadCount, setUnreadCount } = useGlobalContext();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [selfEmail, setSelfEmail] = useState(null);
  const [selfUsername, setSelfUsername] = useState(null);
  const [hasMentionUnread, setHasMentionUnread] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [swipe, setSwipe] = useState({ id: null, dx: 0 });
  const [highlightId, setHighlightId] = useState(null);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  // Saran pesan (lihat utils/judgeChatSuggestions.js): laporan submit
  // "Kirim ke Operator" yang gagal + template per task juri.
  const { assignments } = useJudgeAssignments();
  const [failedSubmit, setFailedSubmit] = useState(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const usingFailureRef = useRef(false);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const fileInputRef = useRef(null);
  const composerRef = useRef(null);

  const judgeTasks = getJudgeTasks(assignments, eventId, category);

  // Ambil laporan gagal yg tersimpan (submit gagal sebelum chat dibuka) +
  // dengarkan kegagalan baru dari halaman juri.
  useEffect(() => {
    setFailedSubmit(readLastSubmitFailure(eventId, category));
    const onFailed = (e) => {
      const f = e.detail;
      if (!f || String(f.eventId) !== String(eventId) || f.category !== category) {
        return;
      }
      setFailedSubmit(f);
      setSuggestionsOpen(true);
    };
    window.addEventListener(SUBMIT_FAILED_EVENT, onFailed);
    return () => window.removeEventListener(SUBMIT_FAILED_EVENT, onFailed);
  }, [eventId, category]);

  // Isi composer dgn saran (TIDAK langsung terkirim — juri bisa edit dulu).
  const applySuggestion = (value, isFailure = false) => {
    usingFailureRef.current = isFailure;
    setText(value);
    setTimeout(() => {
      const el = composerRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }, 0);
  };
  const messageRefs = useRef({});
  const isPrependingRef = useRef(false);
  const pendingScrollAdjustRef = useRef(null);
  const swipeStartRef = useRef({ x: 0, y: 0, id: null, locked: null });
  const swipeDxRef = useRef(0);

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

  const quotePreviewText = (m) => {
    if (!m) return "";
    if (m.text) return m.text;
    if (m.attachment?.type === "image") return "📷 Gambar";
    if (m.attachment?.type === "audio") return "🎤 Pesan suara";
    return "";
  };

  // Cek apakah teks pesan me-mention username sendiri (format "@username",
  // pola yang sama dengan yang dipakai operator sts-timingsystem saat mengetik mention).
  const isMentioned = (text, username) => {
    if (!text || !username) return false;
    const escaped = String(username).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|\\s)@${escaped}(?=\\s|$)`, "i");
    return re.test(text);
  };

  const jumpToMessage = (id) => {
    const el = messageRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1200);
  };

  // Swipe-to-reply ala WhatsApp (khusus perangkat sentuh — mouse tidak
  // memicu event touch sama sekali, jadi otomatis hanya aktif di mobile/tablet).
  const SWIPE_THRESHOLD = 56;
  const SWIPE_MAX = 72;

  const onRowTouchStart = (m) => (e) => {
    if (e.touches.length !== 1 || m.deleted) return;
    swipeStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      id: m._id,
      locked: null,
    };
    swipeDxRef.current = 0;
  };

  const onRowTouchMove = (m) => (e) => {
    const start = swipeStartRef.current;
    if (start.id !== m._id || !e.touches.length) return;
    const dx = e.touches[0].clientX - start.x;
    const dy = e.touches[0].clientY - start.y;
    if (start.locked === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      start.locked = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (start.locked !== "h") return;
    const clamped = Math.max(0, Math.min(SWIPE_MAX, dx));
    swipeDxRef.current = clamped;
    setSwipe({ id: m._id, dx: clamped });
  };

  const onRowTouchEnd = (m) => () => {
    const start = swipeStartRef.current;
    if (start.id === m._id && swipeDxRef.current >= SWIPE_THRESHOLD) {
      setReplyingTo(m);
    }
    swipeStartRef.current = { x: 0, y: 0, id: null, locked: null };
    swipeDxRef.current = 0;
    setSwipe({ id: null, dx: 0 });
  };

  // Ambil identitas juri (untuk bubble "milik sendiri")
  useEffect(() => {
    if (!enabled) return;
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/judges", { cache: "no-store" });
        const data = await res.json();
        if (data?.user?.email) setSelfEmail(data.user.email);
        if (data?.user?.username) setSelfUsername(data.user.username);
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
          )}&category=${encodeURIComponent(category)}&limit=${PAGE_SIZE}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data?.success) {
          const incoming = data.data || [];
          if (!silent) {
            // initial load (buka panel / ganti kategori) -> selalu batch
            // TERBARU, mulai fresh dari status pagination
            setMessages(incoming);
            setHasMoreOlder(Boolean(data.hasMore));
          } else {
            // saat polling diam-diam, cuma gabungkan pesan baru (hindari
            // menimpa state lokal yg mungkin lebih baru dari optimistic update)
            setMessages((prev) => {
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
          if (isMentioned(msg.text, selfUsername)) setHasMentionUnread(true);
        }
        return currentlyOpen;
      });

      playTone();
    };

    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
  }, [enabled, eventId, category, setUnreadCount, selfUsername]);

  const scrollToBottom = (behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  // Pertahankan posisi scroll saat pesan lama baru saja di-prepend (load
  // more ke atas) — dijalankan sebelum browser paint supaya tidak kelihatan
  // "lompat". Harus lebih dulu dari efek scroll-ke-bawah di bawah ini.
  useLayoutEffect(() => {
    const el = messagesContainerRef.current;
    const pending = pendingScrollAdjustRef.current;
    if (el && pending) {
      el.scrollTop = el.scrollHeight - pending.scrollHeight + pending.scrollTop;
      pendingScrollAdjustRef.current = null;
    }
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    // Barusan prepend pesan lama (load more) -> jangan lompat ke bawah,
    // posisi scroll sudah ditangani useLayoutEffect di atas.
    if (isPrependingRef.current) {
      isPrependingRef.current = false;
      return;
    }
    setUnreadCount(0);
    setHasMentionUnread(false);
    scrollToBottom();
  }, [isOpen, messages.length, setUnreadCount]);

  // Load pesan LEBIH LAMA saat user scroll ke atas — batch di-prepend ke
  // awal daftar, posisi scroll dipertahankan lewat pendingScrollAdjustRef.
  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMoreOlder || !messages.length) return;
    const container = messagesContainerRef.current;
    const oldestId = messages[0]?._id;
    if (!oldestId) return;

    setLoadingOlder(true);
    try {
      const res = await fetch(
        `/api/chat?eventId=${encodeURIComponent(eventId)}&category=${encodeURIComponent(
          category
        )}&limit=${PAGE_SIZE}&before=${encodeURIComponent(oldestId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data?.success) {
        const older = data.data || [];
        setHasMoreOlder(Boolean(data.hasMore));
        if (older.length) {
          if (container) {
            pendingScrollAdjustRef.current = {
              scrollHeight: container.scrollHeight,
              scrollTop: container.scrollTop,
            };
          }
          isPrependingRef.current = true;
          setMessages((prev) => [...older, ...prev]);
        }
      }
    } catch {
      // gagal load pesan lama bukan fatal — user bisa scroll lagi buat retry
    } finally {
      setLoadingOlder(false);
    }
  };

  const onMessagesScroll = (e) => {
    if (e.currentTarget.scrollTop < 60) loadOlderMessages();
  };

  const sendChatMessage = async ({ text: msgText = "", attachment = null }) => {
    const replyTo = replyingTo
      ? {
          _id: replyingTo._id,
          senderEmail: replyingTo.senderEmail,
          senderName: replyingTo.senderName,
          text: replyingTo.text || "",
          attachmentType: replyingTo.attachment?.type || null,
        }
      : null;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, category, text: msgText, attachment, replyTo }),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      showUploadError(data?.message || "Gagal mengirim pesan");
      return false;
    }

    const saved = data.data;
    setMessages((prev) => [...prev, saved]);
    setReplyingTo(null);

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
      replyTo: saved.replyTo || null,
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

  // Tinggi textarea composer mengikuti isi (maks diatur max-h di className).
  useLayoutEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [text]);

  // Enter / Shift+Enter = baris baru (default textarea). Ctrl/⌘ + Enter =
  // kirim — di HP cukup pakai tombol kirim.
  const handleComposerKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSend(e);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const ok = await sendChatMessage({ text: trimmed });
      if (ok) {
        setText("");
        // Laporan submit gagal sudah terkirim -> jangan ditawarkan lagi.
        if (usingFailureRef.current) {
          clearLastSubmitFailure();
          setFailedSubmit(null);
          usingFailureRef.current = false;
        }
      }
    } catch {
      showUploadError("Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  };

  const uploadAttachment = async (fileOrBlob, type) => {
    const form = new FormData();
    form.append("file", fileOrBlob, fileOrBlob.name);
    form.append("type", type);

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
        <img src={liveChatIcon.src} alt="" className="w-8 h-8" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {failedSubmit && !isOpen && (
          <span
            className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm animate-pulse"
            title="Ada Kirim ke Operator yang gagal — laporkan lewat chat"
          >
            !
          </span>
        )}
        {hasMentionUnread && (
          <span
            className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm animate-pulse"
            aria-label="Ada pesan yang menyebut Anda"
            title="Anda disebut (mention)"
          >
            @
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
              <div className="flex items-center gap-2.5">
                <img src={liveChatIcon.src} alt="" className="w-8 h-8 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Live Chat - STiming Scoring</p>
                  <p className="text-xs opacity-90">Race Category : {categoryLabel}</p>
                </div>
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
            <div
              ref={messagesContainerRef}
              onScroll={onMessagesScroll}
              className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(24,116,165,0.07) 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9, #f8fafc)",
                backgroundSize: "18px 18px, 100% 100%",
              }}
            >
              {loading ? (
                <p className="text-center text-sm text-gray-500 py-6">
                  Memuat pesan…
                </p>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-6">
                  Belum ada pesan.
                </p>
              ) : (
                <>
                  {hasMoreOlder ? (
                    <div className="flex justify-center py-1.5">
                      {loadingOlder ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <svg
                            className="animate-spin w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="3"
                              opacity="0.25"
                            />
                            <path
                              d="M22 12a10 10 0 0 0-10-10"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                          </svg>
                          Memuat pesan lama…
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={loadOlderMessages}
                          className="text-xs font-medium text-blue-500 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition"
                        >
                          Muat pesan sebelumnya
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-[11px] text-gray-300 py-1">
                      — Awal percakapan —
                    </p>
                  )}
                  {messages.map((m, idx) => {
                  const isSelf = selfEmail && m.senderEmail === selfEmail;
                  const replyIsSelf = m.replyTo && m.replyTo.senderEmail === selfEmail;
                  const mentionsMe =
                    !isSelf && !m.deleted && isMentioned(m.text, selfUsername);
                  return (
                    <div
                      key={m._id || idx}
                      ref={(el) => {
                        if (el && m._id) messageRefs.current[m._id] = el;
                      }}
                      className={`relative flex items-end gap-2 ${
                        isSelf ? "justify-end" : "justify-start"
                      }`}
                      onTouchStart={onRowTouchStart(m)}
                      onTouchMove={onRowTouchMove(m)}
                      onTouchEnd={onRowTouchEnd(m)}
                      onTouchCancel={onRowTouchEnd(m)}
                      style={{
                        transform: swipe.id === m._id ? `translateX(${swipe.dx}px)` : undefined,
                        transition: swipe.id === m._id ? "none" : "transform 0.2s ease",
                      }}
                    >
                      {swipe.id === m._id && swipe.dx > 4 && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center"
                          style={{ opacity: Math.min(1, swipe.dx / SWIPE_THRESHOLD) }}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11Z" />
                          </svg>
                        </div>
                      )}
                      {!isSelf && (
                        <div
                          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
                          style={{ background: avatarColor(m.senderName) }}
                        >
                          {initials(m.senderName)}
                        </div>
                      )}
                      <div className={`group relative max-w-[75%] ${isSelf ? "" : ""}`}>
                        {!m.deleted && (
                          <p
                            className={`text-xs font-semibold mb-1 px-1 ${
                              isSelf ? "text-right" : ""
                            }`}
                            style={{ color: isSelf ? "#2563eb" : avatarColor(m.senderName) }}
                          >
                            {isSelf ? "Saya" : m.senderName}
                            {mentionsMe && (
                              <span
                                className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold align-middle"
                                title="Anda disebut (mention)"
                              >
                                @
                              </span>
                            )}
                          </p>
                        )}
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm shadow-sm transition-shadow ${
                            isSelf
                              ? "bg-blue-500 text-white rounded-br-sm"
                              : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                          } ${m.deleted ? "opacity-70" : ""} ${
                            highlightId === m._id ? "ring-2 ring-blue-400" : ""
                          } ${mentionsMe ? "ring-2 ring-red-300" : ""}`}
                        >
                          {!m.deleted && m.replyTo && (
                            <button
                              type="button"
                              onClick={() => jumpToMessage(m.replyTo._id)}
                              className={`block w-full text-left mb-1.5 rounded-lg px-2 py-1 border-l-4 ${
                                isSelf
                                  ? "bg-white/15 border-white/60"
                                  : "bg-gray-50 border-blue-400"
                              }`}
                            >
                              <p
                                className={`text-[11px] font-semibold truncate ${
                                  isSelf ? "text-white/90" : ""
                                }`}
                                style={
                                  isSelf || replyIsSelf
                                    ? undefined
                                    : { color: avatarColor(m.replyTo.senderName) }
                                }
                              >
                                {replyIsSelf ? "Saya" : m.replyTo.senderName}
                              </p>
                              <p
                                className={`text-[11px] truncate ${
                                  isSelf ? "text-white/70" : "text-gray-500"
                                }`}
                              >
                                {m.replyTo.text ||
                                  (m.replyTo.attachmentType === "image"
                                    ? "📷 Gambar"
                                    : m.replyTo.attachmentType === "audio"
                                    ? "🎤 Pesan suara"
                                    : "")}
                              </p>
                            </button>
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
                                    onLoad={() => scrollToBottom("auto")}
                                  />
                                </button>
                              )}
                              {m.text && (
                                <p className="whitespace-pre-wrap break-words">
                                  {m.text}
                                </p>
                              )}
                            </>
                          )}

                          <p
                            className={`text-[10px] mt-1 text-right ${
                              isSelf ? "text-white/70" : "text-gray-400"
                            }`}
                          >
                            {formatChatTime(m.createdAt)}
                          </p>
                        </div>

                        {!m.deleted && (
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 ${
                              isSelf ? "-left-7" : "-right-7"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setReplyingTo(m)}
                              className="w-6 h-6 rounded-full text-gray-300 hover:text-blue-500 hover:bg-blue-50 flex items-center justify-center transition opacity-70 hover:opacity-100"
                              aria-label="Balas pesan"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11Z" />
                              </svg>
                            </button>
                            {isSelf && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDeleteId((cur) =>
                                    cur === m._id ? null : m._id
                                  )
                                }
                                className="w-6 h-6 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition opacity-70 hover:opacity-100"
                                aria-label="Hapus pesan"
                              >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                  <path d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7Zm3-3h6l1 2h4v2H4V6h4l1-2Z" />
                                </svg>
                              </button>
                            )}
                          </div>
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
                  })}
                </>
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

            {/* Preview balasan (Quote Message) */}
            {replyingTo && (
              <div className="px-3 pt-2 pb-1.5 bg-blue-50 border-t border-blue-100 flex items-start gap-2">
                <div className="w-1 self-stretch rounded-full bg-blue-400" />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-semibold"
                    style={{
                      color:
                        replyingTo.senderEmail === selfEmail
                          ? "#2563eb"
                          : avatarColor(replyingTo.senderName),
                    }}
                  >
                    Membalas{" "}
                    {replyingTo.senderEmail === selfEmail ? "Saya" : replyingTo.senderName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {quotePreviewText(replyingTo)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-blue-100 flex-shrink-0"
                  aria-label="Batal balas"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Saran pesan */}
            {suggestionsOpen ? (
              <div className="px-2 sm:px-3 pt-2 border-t bg-gray-50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Saran pesan
                  </span>
                  <button
                    type="button"
                    onClick={() => setSuggestionsOpen(false)}
                    className="text-[11px] text-gray-400 hover:text-gray-600"
                  >
                    Sembunyikan
                  </button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-2">
                  {failedSubmit && (
                    <button
                      type="button"
                      onClick={() =>
                        applySuggestion(buildFailureMessage(failedSubmit), true)
                      }
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                      title="Isi pesan dengan data submit yang gagal"
                    >
                      ⚠️ Laporkan submit gagal
                      {failedSubmit.task ? ` · ${failedSubmit.task}` : ""}
                      {failedSubmit.bib ? ` · BIB ${failedSubmit.bib}` : ""}
                    </button>
                  )}
                  {judgeTasks.map((task) => (
                    <button
                      key={task}
                      type="button"
                      onClick={() =>
                        applySuggestion(buildTaskTemplate(category, task))
                      }
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                      title={`Template laporan manual ${task}`}
                    >
                      📋 Laporan {task}
                    </button>
                  ))}
                  {GENERAL_SUGGESTIONS.map((sg) => (
                    <button
                      key={sg.label}
                      type="button"
                      onClick={() => applySuggestion(sg.text)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 transition"
                      title={sg.text}
                    >
                      {sg.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-3 pt-1.5 border-t bg-gray-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSuggestionsOpen(true)}
                  className={`text-[11px] font-semibold ${
                    failedSubmit ? "text-red-600" : "text-blue-600"
                  } hover:underline pb-1`}
                >
                  {failedSubmit ? "⚠️ " : ""}Tampilkan saran pesan
                </button>
              </div>
            )}

            {/* Composer */}
            <form
              onSubmit={handleSend}
              className="p-2 sm:p-3 flex items-end gap-1 sm:gap-1.5 bg-white"
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
                disabled={sending || uploading}
                className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-40 flex items-center justify-center transition"
                aria-label="Kirim gambar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                >
                  <path d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4Zm0 2h16v8.59l-3.3-3.3a1 1 0 0 0-1.4 0L11 15.59l-2.3-2.3a1 1 0 0 0-1.4 0L4 16.59V6Zm4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
                </svg>
              </button>

              {/* textarea (bukan input) supaya Enter = baris baru; kirim
                  lewat tombol atau Ctrl/⌘ + Enter. */}
              <textarea
                ref={composerRef}
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={uploading ? "Mengunggah…" : "Tulis pesan…"}
                className="flex-1 min-w-0 px-3 py-2 border rounded-2xl text-base leading-snug resize-none max-h-[110px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                disabled={sending || uploading}
              />
              <button
                type="submit"
                disabled={sending || uploading || !text.trim()}
                title="Kirim (Ctrl/⌘ + Enter)"
                className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white flex items-center justify-center transition"
                aria-label="Kirim"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
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
