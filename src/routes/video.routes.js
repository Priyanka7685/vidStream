import { Router } from "express";
import { 
    publishVideo,
    getVideoById,
    getAllVideos,
    updateVideo,
    deleteVideo, 
    togglePublishStatus
 } from "../controllers/videos.controller.js"
 import { upload } from "../middlewares/multer.middlewares.js"
 import {verifyJWT} from "../middlewares/auth.middlewares.js" 


const router = Router()
router.use(verifyJWT)

 
router.route("/")
    .get(getAllVideos)
    .post(
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    publishVideo
)
router.route("/:videoId").get(getVideoById)
router.route("/:videoId").delete(deleteVideo)
router.route("/:videoId").patch(upload.single("thumbnail"),updateVideo)
router.route("/toggle/publish/:videoId").patch(togglePublishStatus)



export default router