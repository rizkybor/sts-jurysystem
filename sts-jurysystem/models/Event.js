import mongoose, { Schema, model, models } from 'mongoose';

const EventSchema = new Schema(
  {
    eventName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    levelName: {
      type: String,
    },
    riverName: {
      type: String,
    },
    location: {
      street: {
        type: String,
      },
      city: {
        type: String,
      },
      state: {
        type: String,
      },
      zipcode: {
        type: String,
      },
    },
    schedule: [
      {
        date: {
          type: Date,
        },
        activity: {
          type: String,
        },
      },
    ],
    eventCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category', // Reference to stsListCategories
      },
    ],
    divisionCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Division', // Reference to stsListDivision
      },
    ],
    raceCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'RaceCategory', // Reference to stsListGender or equivalent
      },
    ],
    initialCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Initial', // Reference to stsListInitial
      },
    ],
    chiefJudge: {
      name: {
        type: String,
      },
      sign: {
        type: String,
      },
    },
    raceDirector: {
      name: {
        type: String,
      },
      sign: {
        type: String,
      },
    },
    safetyDirector: {
      name: {
        type: String,
      },
      sign: {
        type: String,
      },
    },
    eventDirector: {
      name: {
        type: String,
      },
      sign: {
        type: String,
      },
    },
    tags: [
      {
        type: String,
      },
    ],
    statusEvent: {
      type: String,
      enum: ['Activated', 'Deactivated'],
      default: 'Activated',
    },
    logoSupport: [
      {
        type: String,
      },
    ],
    logoEvent: {
      type: String,
    },
    images: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'stsEvents', // Ensure the collection name matches your MongoDB collection
  }
);

const Event = models.Event || model('Event', EventSchema);
export default Event;