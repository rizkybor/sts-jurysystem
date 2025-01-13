const ParticipantSchema = new Schema({
    nameTeam: {
      type: String,
      required: true,
    },
    bibTeam: {
      type: String,
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    divisionId: {
      type: Schema.Types.ObjectId,
      ref: 'Division',
    },
    raceCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'RaceCategory',
    },
    registrationDate: {
      type: Date,
      required: true,
    },
    bracketStatus: {
      type: String,
      enum: ['Pending', 'Active', 'Eliminated', 'Winner'],
      default: 'Pending',
    },
    currentRound: {
      type: Number,
    },
  }, { timestamps: true });
  
  const Participant = models.Participant || model('Participant', ParticipantSchema);
  export default Participant;