import { Router } from 'express';
import { 
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylist,
    removeVideoFromPlaylist,
    updatePlaylist
} from "../controllers/playlist.controller.js"
import {verifyJWT} from "../middlewares/auth.middlewares.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createPlaylist)
router.route("/user/:userId").get(getUserPlaylist)
router.route("/:playlistId").get(getPlaylistById)
router.route("/:playlistId").delete(deletePlaylist)
router.route("/add/:videoId/:playlistId").post(addVideoToPlaylist);
router.route("/remove/:videoId/:playlistId").delete(removeVideoFromPlaylist);
router.route("/:playlistId").patch(updatePlaylist);

export default router
    