import mongoose from 'mongoose'

const AttachmentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['image', 'audio'], required: true },
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    format: { type: String, default: '' },
    bytes: { type: Number, default: 0 },
    duration: { type: Number, default: null }, // detik, khusus audio
  },
  { _id: false }
)

const ReplyToSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    senderEmail: { type: String, required: true },
    senderName: { type: String, required: true },
    text: { type: String, default: '' },
    attachmentType: { type: String, enum: ['image', 'audio', null], default: null },
  },
  { _id: false }
)

const ChatMessageSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['sprint', 'h2h', 'slalom', 'drr', 'rx'],
    },
    senderEmail: { type: String, required: true },
    senderName: { type: String, required: true },
    text: { type: String, required: false, default: '' },
    attachment: { type: AttachmentSchema, default: null },
    replyTo: { type: ReplyToSchema, default: null },
    deleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: 'chatMessages' }
)

ChatMessageSchema.pre('validate', function (next) {
  // pesan yang sudah dihapus (soft-delete) sengaja text/attachment-nya kosong
  if (!this.deleted && !this.text && !this.attachment) {
    next(new Error('text atau attachment wajib diisi salah satu'))
  } else {
    next()
  }
})

ChatMessageSchema.index({ eventId: 1, category: 1, createdAt: 1 })
// Dipakai buat cursor pagination live chat (load pesan lama saat scroll ke atas)
ChatMessageSchema.index({ eventId: 1, category: 1, _id: -1 })

export default mongoose.models.ChatMessage ||
  mongoose.model('ChatMessage', ChatMessageSchema)
