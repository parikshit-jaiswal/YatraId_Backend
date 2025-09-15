import { Request, Response } from "express";
import axios from "axios";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { sendOtpEmail } from "../utils/sendMail";

const test = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await sendOtpEmail("parikshit2313007@akgec.ac.in", "123456");
    res.status(200).json(new ApiResponse(200, { message: "Test route is working" }, "Success"));
});

export { test };
