import { Schema, model, models } from 'mongoose';

const PenaltySchema = new Schema(
  {
    participantId: {
      type: Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['SPRINT', 'SLALOM', 'DRR', 'HEAD2HEAD'], // Kategori yang valid
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    juryId: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Referensi ke model Juri
      required: true,
    },
    penalties: [
      {
        round: {
          type: Number,
          required: function () {
            return this.category === 'SLALOM' || this.category === 'HEAD2HEAD';
          },
        },
        match: {
          type: Number,
          required: function () {
            return this.category === 'HEAD2HEAD';
          },
        },
        team: {
          type: String,
          required: function () {
            return this.category === 'HEAD2HEAD';
          },
        },
        type: {
          type: String,
          required: true,
          enum: ['Start', 'Section', 'Finish'], // Jenis penalti
        },
        section: {
          type: Number,
          required: function () {
            return this.type === 'Section';
          },
        },
        penaltyPoints: {
          type: Number,
          required: true,
        },
        reason: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Penalty = models.Penalty || model('Penalty', PenaltySchema);

export default Penalty;