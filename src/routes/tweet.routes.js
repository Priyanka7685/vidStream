import { Router } from "express"
import {
    createTweet,
    getUserTweet,
    updateTweet,
    deleteTweet
} from "../controllers/tweet.controller.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js"

const router = Router()

router.use(verifyJWT)

router.route("/").post(createTweet)
router.route("/user/:userId").get(getUserTweet)
router.route("/:tweetId").patch(updateTweet)
router.route("/:tweetId").delete(deleteTweet)

export default router