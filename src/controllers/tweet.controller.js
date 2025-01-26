import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "../models/tweet.models.js";

// tweets always used on users

// create tweet
const createTweet = asyncHandler( async(req, res) => {
    const { content } = req.body

    if(!content) { 
        throw new ApiError(404, "Content required")
    }

    const userId = req.user._id

    const newTweet = new Tweet({
        content,
        owner: new mongoose.Types.ObjectId(userId)
        // owner: userId
    })

    await newTweet.save()

    return res.status(200).json( new ApiResponse(200, newTweet, "Tweet added successfully"))
})


// get users tweet
const getUserTweet = asyncHandler( async(req, res) => {
    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query

    if(!userId) {
        throw new ApiError("userId required to get tweet")
    }

   try {
       const filter = {owner: new mongoose.Types.ObjectId(userId) } //matching comments by userId


     const tweets = await Tweet.aggregate([
         {
             $match: filter
         },
         {
             $sort: {
                 createdAt: -1
             },
         },
         {
             $skip: (Number(page) - 1)*Number(limit)
         },
         {
             $limit: Number(limit)
         }
     ])

     const totalTweets = await Tweet.countDocuments( filter)
 
     if(!tweets || tweets.length === 0) {
         throw new ApiError(404, "No tweets found")
     }
     
      res.status(200).json(new ApiResponse(200, tweets, "Tweets fetched successfully",{
             total: totalTweets,
             page: Number(page),
             pages: Math.ceil(totalTweets/limit),
             limit: Number(limit)
     }))

   } catch (error) {
    console.error("Error fetching tweets:", error);
    throw new ApiError(404, "Failed to fetch tweets")
   }
})

// update tweet
const updateTweet = asyncHandler( async(req, res) => {
    const { tweetId } = req.params
    const { content } = req.body

    console.log("Tweet ID from params:", tweetId);


    if(!content) {
        throw new ApiError(404, "Content required to update tweet")
    }
    if(!tweetId) {
        throw new ApiError(400, "tweetId is required")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
            }
        },
        {new: true}
    )

    if(!updatedTweet) {
        throw new ApiError(500, "Not able to find previous tweet")
    }

    return res.status(200).json( new ApiResponse(200, updatedTweet, "Tweet updated successfully"))

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