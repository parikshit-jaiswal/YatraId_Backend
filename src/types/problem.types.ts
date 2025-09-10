import mongoose from "mongoose";

export interface ITestCase {
  input: string;
  output: string;
  explanation: string;
}

export interface IProblem extends mongoose.Document {
  title: string;
  maxScore: number;
  isSolved: boolean;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  createdBy: mongoose.Types.ObjectId;
  solution: mongoose.Types.ObjectId;
  tags: string[];
  testCases: ITestCase[];
  timeLimit: number; // in milliseconds
  memoryLimit: number; // in MB
  createdAt: Date;
  updatedAt: Date;
}