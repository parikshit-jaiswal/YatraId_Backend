import mongoose from "mongoose";

export interface ITestCase {
  input: string;
  output: string;
  explanation?: string;
}

export interface ISolution extends mongoose.Document {
  problemId: mongoose.Types.ObjectId;
  score: number;
  testCases: ITestCase[];
  testCasesPassed: ITestCase[];
  solutionCode: string;
  languageUsed: string;
  timeOccupied: number;
  memoryOccupied: number;
  timeGivenOnSolution: number;
  createdAt: Date;
  updatedAt: Date;
}