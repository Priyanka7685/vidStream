import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "../models/tweet.models.js";

// create tweet
const createTweet = asyncHandler( async(req, res) => {
    
})

// get users tweet
const getUserTweet = asyncHandler( async(req, res) => {
    const { videoId } = req.params

    if(!videoId) {
        throw new ApiError("VideoId required to get tweet")
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.tweets?._id)
            }
        },
        {
            $sort: {
                createdAt: -1
            },
        },
    ])

    if(!tweets || tweets.length === 0) {
        throw new ApiError(404, "No tweets found")
    }
    
    return res.status(200).json( ApiResponse(200, tweets, "Tweets fetched successfully"))
})

// update tweet
const updateTweet = asyncHandler( async(req, res) => {
    const { content } = req.body

    if(!content) {
        throw new ApiError(404, "Content required to update tweet")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        req.updateTweet?._id,
        {
            $set: {
                content,
            }
        },
        {new: true}
    )

    if(!updatedTweet) {
        throw new ApiError(404, "Not able to find previous tweet")
    }

    return req.status(200).json( new ApiResponse(200, updateTweet, "Tweet updated successfully"))

})

// delete tweet
const deleteTweet = asyncHandler( async(req, res) => {
    const { tweetId } = req.params
    

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId)

    if(!deleteTweet) {
        throw new ApiError(404, "Unable to delete tweet")
    }

    return res.status(200).json( new ApiResponse(200, deleteTweet, "Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweet,
    updateTweet,
    deleteTweet
}