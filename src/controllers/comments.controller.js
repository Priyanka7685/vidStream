import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Comment } from "../models/comment.models.js"



// add comment
const addComment = asyncHandler(async(req, res) => {
    const { content } = req.body

    if(!content ) {
        throw new ApiError(400, "Content required")
    }

    const newComment = new Comment({
        content,
    })

    await newComment.save()

    return res.status(200).json( new ApiResponse(200, newComment, "Comment added successfully"))
})

// update comment
const updateComment = asyncHandler( async(req, res) => {

    const { content } = req.body

    if(!content ) {
        throw new ApiError(400, "Content required to update comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        req.updatedComment?._id,
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

    return req.status(200).json( new ApiResponse(200, updateComment, "Comment updated successfully"))
    
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

// get video comments
const getVideoComments = asyncHandler( async(req,res) => {
    const { videoId } = req.params

    if(!videoId) {
        throw new ApiError("VideoId required to get comments")
    }

    const comments = await Comment.aggregate([
        {
            $match: {
            _id: new mongoose.Types.ObjectId(req.comments?._id)
        },
    },
    {
        $sort: {
            createdAt: -1 //descending order
        },
    },
    {
        $limit: 10
    }
])

    if(!comments || comments.length === 0) {
        throw new ApiError(404,"No comments found")
    }

    return res.status(200).json( ApiResponse(200, comments, "Comments fetched succeffully"))
})


export {
    addComment,
    deleteComment,
    updateComment,
    getVideoComments
}