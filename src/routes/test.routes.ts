import { Router } from "express";
import { test } from "../controllers/test.controllers";

const router: Router = Router();

router.route("/test").get(test);

export default router;
