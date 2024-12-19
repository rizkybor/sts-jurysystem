const ResultSchema = new Schema({
    participantId: {
      type: Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['SPRINT', 'SLALOM', 'DRR', 'HEAD2HEAD'],
    },
    bracketId: {
      type: Schema.Types.ObjectId,
      ref: 'Bracket',
      required: false, // hanya digunakan untuk kategori HEAD2HEAD
    },
    scores: {
      type: Map,
      of: String, // misalnya {"SPRINT": "90", "SLALOM": "80"}
    },
    totalScore: {
      type: Number,
    },
    ranked: {
      type: String,
    },
  }, { timestamps: true });
  
  const Result = models.Result || model('Result', ResultSchema);
  export default Result;