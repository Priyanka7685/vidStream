import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Comment } from "../models/comment.models.js"



// add comment
const addComment = asyncHandler(async(req, res) => {
    const { videoId } = req.params
    const { content } = req.body

    if(!content ) {
        throw new ApiError(400, "Content required")
    }

    if(!videoId) {
        throw new ApiError(404, "VideoId required")
    }

    const userId = req.user._id; 

    const newComment = new Comment({
        content,
        video: new mongoose.Types.ObjectId(videoId),  // Linking the comment to the specific video 
        owner: userId, // Linking the comment to the user
    })

    await newComment.save()

    return res.status(200).json( new ApiResponse(200, newComment, "Comment added successfully"))
})


// get video comments
const getVideoComments = asyncHandler( async(req,res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query


    if(!videoId) {
        throw new ApiError("VideoId required to get comments")
    }
    
    try {

        const filter = { video: new mongoose.Types.ObjectId(videoId)}; //matching comments by videoId
        const sort = { createdAt: -1 }

        const comments = await Comment.aggregate([
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
                $limit: limit
            }
        ])

        const totalComments = await Comment.countDocuments( filter );

        if(!comments || comments.length === 0) {
            throw new ApiError(404,"No comments found")
        }

        res.status(200).json(new ApiResponse(200, comments, "Comment fetched successfully", {
            total: totalComments,
            page: Number(page),
            pages: Math.ceil(totalComments/limit),
            limit: Number(limit)
        }))

    } 
    catch (error) {
        console.error("Error fetching comments:", error);
        throw new ApiError(500, "Failed to fetch comments");
    }

  
})


// update comment
const updateComment = asyncHandler( async(req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if(!content ) {
        throw new ApiError(400, "Content required to update comment")
    }

    if(!commentId) {
        throw new ApiError(404, "CommentId is required")
    }
 

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content,
            }
        },
        { new: true}
    )

    if(!updatedComment) {
        throw new ApiError(404,"Not able to find previous comment")
    }

    return res.status(200).json( new ApiResponse(200, updateComment, "Comment updated successfully"))
    
})

// delete comment
const deleteComment = asyncHandler( async(req, res) => {
    const { commentId } = req.params  // from route parameters

    const deletedComment = await Comment.findByIdAndDelete(commentId)

    if(!deletedComment) {
        throw new ApiError(404, "Unable to delete comment")
    }

    return res.status(200).json( new ApiResponse(200, deleteComment, "Comment deleted successfully"))
})



export {
    addComment,
    deleteComment,
    updateComment,
    getVideoComments
}