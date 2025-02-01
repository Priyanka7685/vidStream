import mongoose from "mongoose"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary,uploadOnCloudinary } from "../utils/cloudinary.js"
import { Video } from "../models/video.models.js"
import { ApiError } from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js" 
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"
 
const getAllVideos = asyncHandler( async(req, res) => {
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

const publishVideo = asyncHandler( async(req, res) => {
    const { title, description } = req.body

    const videoFile = req.files?.videoFile?.[0]?.path; // Path to the uploaded video file
    const thumbnail = req.files?.thumbnail?.[0]?.path; // Path to the thumbnail

    // access user's id from req.user(set by verifyjwt)
    const userId = req.user._id

    
    if(!videoFile || !title || !description) {
        throw new ApiError(404, "VideoLocalPath, title and description are required")
    }

    const existedVideo = await Video.findOne({
        $or: [{title}, {description}, {videoFile}]
    })

    if(existedVideo) {
        throw new ApiError(500, "Video with same title and description already exists")
    }
    
    // uploading on cloudinary
    let uploadVideo, uploadedThumbnail;
    try {
        uploadVideo = await uploadOnCloudinary(videoFile)
        uploadedThumbnail = await uploadOnCloudinary(thumbnail);
        
    } catch (error) {
        console.log("Error uploading video to cloudinary", error);
        throw new ApiError(400, "Failed to upload video on cloudinary")
        
    }


    // save data in mongodb
    let createdVideo
    try {
         createdVideo = await Video.create({
            title,
            description,
            videoFile: uploadVideo?.url || "",
            thumbnail: uploadedThumbnail?.url || "",
        })
        console.log("Video created successfully",createdVideo);
        
    } catch (error) {
        console.log("Video creation failed", error);
        throw new ApiError(404, "Failed to save video in database")
    }

    return res.status(200).json({
        success:true,
        message: "Video published successfully",
        data: createdVideo
    })
})


const getVideoById = asyncHandler( async(req, res) => {
    const { videoId } = req.params

    if(!videoId) {
        throw new ApiError("Video id is required")
    }
    
    try {

        const video = await Video.findById(videoId);

        if (!video) {
            throw new ApiError(404, "Video not found");
        }

        
        video.views += 1;
        await video.save()

        return res.status(200).json({
            success: true,
            id: videoId,
            message: "Video fetched successfully",
            data: {
                title: video.title,
                description: video.description,
                views: video.views,
                thumbnail: video.thumbnail,
                videoFile: video.videoFile,
                isPublished: video.isPublished,
            }
        });

    } catch (error) {
        throw new ApiError(404, "Error in retrieving videos")
    }

    
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {  title, description } = req.body
    const thumbnail = req.file?.path
    //TODO: update video details like title, description, thumbnail

    if(!videoId) {
        throw new ApiError(400, "VideoId required")
    }

    if(!thumbnail){
        throw new ApiError(400, "Thumbnail file is required")
    }

    const newThumbnail = await uploadOnCloudinary(thumbnail)

    if(!newThumbnail.url) {
        throw new ApiError(500, "Something went wrong while uploading thumbnail")
    }

    let video
    try {
     video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: newThumbnail.url
            }
        },
        { new: true }
    )

    if(!videoId) {
        throw new ApiError("Video not found")
    }

    return res.status(200).json( new ApiResponse(200, video, "Video details updated successfully"))

} catch(error) {
    throw new ApiError(200, "Error in updating video details")
}


})


// deleting a video
const deleteVideo = asyncHandler( async(req, res) => {
    const { videoId } = req.params

    if(!videoId) {
        throw new ApiError(401, "Video id is required")
    }

    const video = await Video.findByIdAndDelete(videoId)

    if(!video) {
        throw new ApiError(404, "Video not found")
    }
        await deleteFromCloudinary(video.videoId)

    return res.status(200).json( new ApiResponse(200, video, "Video deleted successfully"))
})

// Toggle publish status
const togglePublishStatus = asyncHandler( async (req, res) => {
    const { videoId } = req.params


    if(!videoId) {
        throw new ApiError(404, "Video id is required")
    } 

    try {
        const video = await Video.findById(videoId)

        if(!video) {
            throw new ApiError(404, "Video not found")
        }

        // Toggle the publish status
        video.isPublished = !video.isPublished
        
        // save the updated video
        await video.save();

        res.status(200).json({
            success: true,
            message: "Video publish status updated successfully",
            data: video,
            isPublished: true
        })

    } catch (error) {
        throw new ApiError(400, "Failed to toggle publish video")
    }
})



export {
    publishVideo,
    getVideoById,
    getAllVideos,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    
}