import mongoose, { Schema } from "mongoose";
import { ISolution } from "../types/solution.types";
import { ITestCase } from "../types/solution.types";

const solutionSchema = new Schema(
  {
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    testCases: {
      type: [
        {
          input: {
            type: String,
            required: true,
          },
          output: {
            type: String,
            required: true,
          },
          explanation: {
            type: String,
            required: false,
          },
        },
      ],
      default: [],
    },
    testCasesPassed: {
      type: [
        {
          input: {
            type: String,
            required: true,
          },
          output: {
            type: String,
            required: true,
          },
          explanation: {
            type: String,
            required: false,
          },
        },
      ],
      default: [],
    },

    solutionCode: {
      type: String,
      required: true,
    },

    languageUsed: {
      type: String,
      required: true,
    },

    timeOccupied: {
      type: Number,
      default: 0,
    },

    memoryOccupied: {
      type: Number,
      default: 0,
    },

    timeGivenOnSolution: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Solution = mongoose.model("Solution", solutionSchema);
export default Solution;
