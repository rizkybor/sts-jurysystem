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
    category: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category', 
      },
    ],
    division: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Division', 
      },
    ],
    racecategory: [
      {
        type: Schema.Types.ObjectId,
        ref: 'RaceCategory',
      },
    ],
    initial: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Initial', 
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
  }
);

const Event = models.Event || model('Event', EventSchema);
export default Event;