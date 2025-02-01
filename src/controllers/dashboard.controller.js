import mongoose from "mongoose"
import {Video} from "../models/video.models.js"
import { User } from "../models/user.models.js"
import {Subscription} from "../models/subscription.models.js"
import {Like} from "../models/like.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;  // Get the userId from the authenticated user
    const videoId = req.videoId
    const subscriptionId = req.subscriptionId
    const likeId = req.likeId
    const viewId = req.viewId

    
    if (!userId) {
        throw new ApiError(400, "User not authenticated");
    }

    try {
  
        const totalVideos = await Video.countDocuments({ videoId });

        const totalViews = await Video.aggregate([
            { $match: { viewId } },
            { $group: { _id: null, totalViews: { $sum: "$views" } } }
        ]);

        const views = totalViews.length > 0 ? totalViews[0].totalViews : 0;

        const totalSubscribers = await Subscription.countDocuments({ subscriptionId });


        const totalLikes = await Like.aggregate([
            { $match: { likeId } },  
            { $group: { _id: null, totalLikes: { $sum: 1 } } }
        ]);

        const likes = totalLikes.length > 0 ? totalLikes[0].totalLikes : 0;


        res.status(200).json(new ApiResponse(200, {
            totalVideos,
            totalViews: views,
            totalSubscribers,
            totalLikes: likes
        }, "Channel stats fetched successfully"));

    } catch (error) {
        console.error("Error fetching channel stats:", error);
        throw new ApiError(500, "Failed to fetch channel stats");
    }
});  


const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const { page = 1, limit = 10, query = '', sortBy = 'createdAt', sortType = 'desc', userId } = req.query

    try {
        const filter = {};

        if(query) {
            filter.$or = [
                { title: { $regex: query, $options: "i"} },
                { description: { $regex: query, $options: "i"} }
            ];
        }

        // Add user id
        if(userId) {
            filter.userId = userId
        }

        // Sorting
        const sort = {
            [sortBy]: sortType === 'desc' ? -1: 1
        }


        // Fetching videos with pagination
        const videos = await Video.aggregate([
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
            },
        ])

        const totalVideos = await Video.aggregate([
            {
                $match: filter
            },
            {
                $count: "total"
            }
        ])

        const total = totalVideos.length > 0 ? totalVideos[0].total : 0

        res.status(200).json(new ApiResponse(200, videos, "All videos fetched successfully", {
            total,
            page: Number(page),
            pages: Math.ceil(totalVideos / limit),
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
    getChannelStats, 
    getChannelVideos
    }