import mongoose from 'mongoose'
import { User } from "../models/user.models.js"
import { Subscription } from "../models/subscription.models.js"
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js' 
import { asyncHandler } from '../utils/asyncHandler.js'


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if(!channelId) {
        throw new ApiError("channelId is required")
    }

    try {
        const userId = req.user._id

        // checking if user already toggled the subscription
        const exisingSubscription = await Subscription.findOne({ channel: channelId, subscriber: userId })

        if(exisingSubscription) {
            await Subscription.deleteOne({_id: exisingSubscription._id})

            return res.status(200).json(new ApiResponse(200, {subscribed: false}, "User unsubscribed successfully"))
        } else {
            const newSubcription = new Subscription({ channel: channelId, subscriber: userId })
            await newSubcription.save()
            return res.status(200).json( new ApiResponse(200, {subscribed: true}, "Subscription added successfully"))
        }
    } catch(error) {
        throw new ApiError(404, "Failed to toggle subscription")
    }
})



// subscribers list of that channel
const getUserChannelSubscribers = asyncHandler( async(req, res) => {
    const { channelId } = req.params
    const { page = 1, limit = 10 } = req.query

    if(!channelId) {
        throw new ApiError("ChannelId is required to get subscribers list")
    }

    try {
        const filter = { channel: new mongoose.Types.ObjectId(channelId) }
        const sort = { createdAt: -1 }

        const subscribers = await Subscription.aggregate([
            {
                $match: filter
            },
            {
                $sort: sort
            },
            {
                $skip: (page-1)*limit
            },
            {
                $limit: limit
            }
        ])

        const totalSubscribers = await Subscription.countDocuments(filter)

        if(!subscribers || subscribers.length === 0) {
            throw new ApiError(404,"No comments found")
        }

        res.status(200).json(new ApiResponse(200, subscribers, "Comment fetched successfully", {
            total: totalSubscribers,
            page: Number(page),
            pages: Math.ceil(totalSubscribers/limit),
            limit: Number(limit)
        }))
    } catch (error) {
        console.error("Error fetching subscribers:", error);
        throw new ApiError(500, "Failed to fetch subscribers");
    }
})


// channel list to which user has subscribed
const getSubscribedChannels = asyncHandler( async(req, res) => {
    const { subscriberId } = req.params
    const { page = 1, limit = 10 } = req.query

    if(!subscriberId) {
        throw new ApiError("ChannelId is required to get subscribers list")
    }

    try {
        const filter = { subscriber: new mongoose.Types.ObjectId(subscriberId) }
        const sort = { createdAt: -1 }

        const channelsUserSubscribed = await Subscription.aggregate([
            {
                $match: filter
            },
            {
                $sort: sort
            },
            {
                $skip: (page-1)*limit
            },
            {
                $limit: limit
            }
        ])

        const totalChannelsUserSubscribed = await Subscription.countDocuments(filter)

        if(!channelsUserSubscribed || channelsUserSubscribed.length === 0) {
            throw new ApiError(404,"No comments found")
        }

        res.status(200).json(new ApiResponse(200, channelsUserSubscribed, "Subscibed channels fetched successfully", {
            total: totalChannelsUserSubscribed,
            page: Number(page),
            pages: Math.ceil(totalChannelsUserSubscribed/limit),
            limit: Number(limit)
        }))
    } catch (error) {
        console.error("Error fetching subscribers:", error);
        throw new ApiError(500, "Failed to fetch subscribers");
    }
})

export { 
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
 }