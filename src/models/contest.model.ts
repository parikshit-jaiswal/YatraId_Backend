import mongoose, { Schema, Model } from "mongoose";
import { IContest } from "../types/contest.types";

const contestSchema = new Schema<IContest>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    moderators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    problems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Problem",
      },
    ],
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    submissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Submission",
      },
    ],
    score: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
      default: 0,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    bestSubmissionTime: {
      type: Number, // in seconds or milliseconds
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    isRated: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    rules: {
      type: String,
      trim: true,
    },
    landingPageTitle: {
      type: String,
      trim: true,
    },
    landingPageDescription: {
      type: String,
      trim: true,
    },
    prizes: {
      type: String,
      trim: true,
    },
    scoring: {
      type: String,
      trim: true,
    },
    landingPageImage: {
      type: String,
      trim: true,
    },
    backgroundImage: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Add any instance methods or static methods if needed in the future

const Contest: Model<IContest> = mongoose.model<IContest>(
  "Contest",
  contestSchema
);
export default Contest;
