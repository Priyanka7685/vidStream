import mongoose from "mongoose"; 
import { Like } from "../models/like.models.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
 
const toggleVideoLike = asyncHandler( async (req, res) => {
    const { videoId } = req.params

    if(!videoId) {
        throw new ApiError("VideoId is required")
    }

    try {

        const userId = req.user._id

        // checking if user already liked the video
        const existingLike = await Like.findOne({ video: videoId, likedBy: userId})

        if(existingLike) {
            await Like.deleteOne({_id: existingLike._id})

            return res.status(200).json(new ApiResponse(200, {liked: false}, "Video unliked successfully"))
        } else {
            // if like doesn't exist
            const newLike = new Like({ video: videoId, likedBy: userId })
            await newLike.save();
            return res.status(200).json(new ApiResponse(200, {liked: true}, "Video liked successfully"))
        }
        
    } catch (error) {
        throw new ApiError(404, "Failed to toggole like")
    }
})

const toggleCommentLike = asyncHandler( async(req, res) => {
    const { commentId } = req.params

    if(!commentId) {
        throw new ApiError("commentId is required")
    }

    try {

        const userId = req.user._id


        // checking if user already liked the video
        const existingLike = await Like.findOne({ comment: commentId, likedBy: userId})


        if(existingLike) {
            await Like.deleteOne({_id: existingLike._id})

            return res.status(200).json(new ApiResponse(200, {liked: false}, "Comment unliked successfully"))
        } else {
            // if like doesn't exist
            const newLike = new Like({ comment: commentId, likedBy: userId })
            await newLike.save();
            return res.status(200).json(new ApiResponse(200, {liked: true}, "Comment liked successfully"))
        }
        
    } catch (error) {
        throw new ApiError(404, "Failed to toggle like")
    }
})


const toggleTweetLike = asyncHandler( async(req, res) => {
    const { tweetId } = req.params

    if(!tweetId) {
        throw new ApiError("tweetId is required")
    }

    try {

        const userId = req.user._id


        // checking if user already liked the video
        const existingLike = await Like.findOne({ tweet: tweetId, likedBy: userId})


        if(existingLike) {
            await Like.deleteOne({_id: existingLike._id})

            return res.status(200).json(new ApiResponse(200, {liked: false}, "Comment unliked successfully"))
        } else {
            // if like doesn't exist
            const newLike = new Like({ tweet: tweetId, likedBy: userId })
            await newLike.save();
            return res.status(200).json(new ApiResponse(200, {liked: true}, "Comment liked successfully"))
        }
        
    } catch (error) {
        throw new ApiError(404, "Failed to toggle like")
    }
})

const getLikedVideos = asyncHandler( async(req, res) => {
    const { page = 1, limit = 10, query = '', sortBy = 'createdAt', sortType = 'desc', userId, videoId, tweetId, commentId } = req.query 

    try {
        const filter = {}

        // add video id
        if(videoId) {
            filter.videoId = videoId
        }

        // add user id
        if(userId) {
            filter.userId = userId
        }

        // add tweet id
        if(tweetId) {
            filter.tweetId = tweetId
        }

        // add comment id
        if(commentId) {
            filter.commentId = commentId
        }

        // sorting
        const sort = {
            [sortBy]: sortType === 'desc' ? -1:1
        }

        const likedVideos = await Like.aggregate ([
            {
                $match: filter
            },
            {
                $sort: sort
            },
            {
                $skip: (page - 1)*limit
            },
            {
                $limit: Number(limit)
            }
        ])
        

        const totalLikes = await Like.countDocuments(filter)  //Counting likes instead of videos
        
                res.status(200).json(new ApiResponse(200, likedVideos, "All videos fetched successfully", {
                    total: totalLikes,
                    page: Number(page),
                    pages: Math.ceil(totalLikes / limit),
                    limit: Number(limit)
                })
            )
        
    } catch (error) {
        res.status(404).json({
            success: false,
            message: "Not able to fetch videos",
            error: error.message
        })
    }
})

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}