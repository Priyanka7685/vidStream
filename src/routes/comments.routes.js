import { Router } from "express";
import {
    addComment,
    updateComment,
    deleteComment,
    getVideoComments
} from "../controllers/comments.controller.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router()

router.use(verifyJWT)  //Applying jwt to all routes in this file

router.route("/:videoId").post(addComment)
router.route("/:videoId").get(getVideoComments)
router.route("/:commentId").patch(updateComment)
router.route("/:commentId").delete(deleteComment)

export default router