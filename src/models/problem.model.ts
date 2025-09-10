import mongoose, { Model, Schema} from "mongoose";
import { IProblem } from "../types/problem.types";

const problemSchema = new Schema({

    title: {
        type: String,
        required: true
    },
    isSolved: {
        type: Boolean,
        default: false  
    },
    maxScore: {
        type: Number,
        required: true,
        default: 0
    },
    solution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Solution",
        required: false,
    },
    statement: {
        type: String,
        required:true,
    },
    inputFormat: {
        type: String,
        required: true
    },
    outputFormat: {
        type: String,
        required: true
    },
    constraints: {
        type: String,
        required: true
    },
    sampleInput: {
        type: String,
        required: true
    },
    sampleOutput: {
        type: String,
        required: true
    },
    explanation: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        required: true,
        enum: ["easy", "medium", "hard"]
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    tags: {
        type: [String],
        required: true
    },
    testCases: [
        {
            input: {
                type: String,
                required: true
            },
            output: {
                type: String,
                required: true
            },
            explanation: {
                type: String,
                required: false
            }
        }
    ],
    timeLimit: {
        type: Number,
        required: true
    },
    memoryLimit: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
})

const Problem: Model<IProblem> = mongoose.model<IProblem>("Problem", problemSchema);
export default Problem;