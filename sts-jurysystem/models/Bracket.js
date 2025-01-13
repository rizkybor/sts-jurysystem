const BracketSchema = new Schema({
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['HEAD2HEAD'],
    },
    rounds: [
      {
        roundNumber: {
          type: Number,
          required: true,
        },
        matches: [
          {
            matchId: {
              type: String,
              required: true,
            },
            teamA: {
              type: Schema.Types.ObjectId,
              ref: 'Participant',
              required: true,
            },
            teamB: {
              type: Schema.Types.ObjectId,
              ref: 'Participant',
              required: true,
            },
            winner: {
              type: Schema.Types.ObjectId,
              ref: 'Participant',
            },
            startTime: {
              type: String,
            },
            finishTime: {
              type: String,
            },
            penalties: [
              {
                team: {
                  type: Schema.Types.ObjectId,
                  ref: 'Participant',
                },
                type: {
                  type: String,
                  enum: ['Start', 'Finish'],
                },
                penaltyPoints: {
                  type: Number,
                },
                reason: {
                  type: String,
                },
              },
            ],
          },
        ],
      },
    ],
  }, { timestamps: true });
  
  const Bracket = models.Bracket || model('Bracket', BracketSchema);
  export default Bracket;