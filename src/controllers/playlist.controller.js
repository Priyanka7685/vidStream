import mongoose from 'mongoose'
import { Playlist } from "../models/playlist.models.js"
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const createPlaylist = asyncHandler(async(req, res) => {
    const { name, description } = req.body

    if( !name || !description) {
        throw new ApiError(404, "name and description are required")
    }

    const existedPlaylist = await Playlist.findOne({
            $or: [{name}, {description}]
        })

        if(existedPlaylist) {
            throw new ApiError(500, "Playlist with this name already exists")
        }

        
    // save data in mongodb
        let createdPlaylist
        try {
             createdPlaylist = await Playlist.create({
                name,
                description,
            })
            
        } catch (error) {
            console.log("Playlist creation failed", error);
            throw new ApiError(404, "Failed to create playlist in database")
        }
    
        return res.status(200).json({
            success:true,
            message: "playlist created successfully",
            data: createdPlaylist
        })
})

const getUserPlaylist = asyncHandler( async(req, res) => {
    const { userId } = req.params 
    const { page = 1, limit = 10 } = req.query

    if(!userId) {
        throw new ApiError("userId required to get user's playlist")
    }

    try {
        const filter = { };
        // const filter = { owner: userId};
        const sort = { createdAt: -1 }

        const userPlaylist = await Playlist.aggregate([
                    {
                        $match: filter
                    },
                    {
                        $sort: sort
                    },
                    {
                        $skip: ((page) - 1)*limit
                    },
                    {
                        $limit: limit
                    }
                ])

                const totalPlaylists = await Playlist.countDocuments( filter );
                
                        if(!userPlaylist || userPlaylist.length === 0) {
                            throw new ApiError(404,"No playlist found")
                        }
                
                        res.status(200).json(new ApiResponse(200, userPlaylist, "Playlists fetched successfully", {
                            total: totalPlaylists,
                            page: Number(page),
                            pages: Math.ceil(totalPlaylists/limit),
                            limit: Number(limit)
                        }))
                

    } catch (error) {
        console.error("Error fetching playlist:", error);
        throw new ApiError(404, "Error in retrieving user Playlist")
    }
})

const getPlaylistById = asyncHandler( async(req, res) => {
    const { playlistId } = req.params

    try {
        const playlist = await Playlist.findById(playlistId)

        if(!playlistId) {
            throw new ApiError("Playlist id is required")
        }

        res.status(200).json({
            success: true,
            data: playlist
        })
    } catch (error) {
        throw new ApiError(404, "Error in retrieving playlist")
    }
})

const deletePlaylist = asyncHandler(async(req, res)=> {
    const { playlistId } = req.params

    if(!playlistId) {
        throw new ApiError("Playlist id is required")
    }

    const playlist = await Playlist.findByIdAndDelete(playlistId)

    if(!playlist) {
        throw new ApiError(404, "Palylist not found")
    }

    return res.status(200).json( new ApiResponse(200, Playlist, "Playlist deleted successfully"))
})

const addVideoToPlaylist = asyncHandler(async(req, res) => {
    const { videoId, playlistId } = req.params

    if(!videoId) {
        throw new ApiError(404, "VideoId required")
    }
    if(!playlistId) {
        throw new ApiError(404, "PlaylistId required")
    }

    try {
        const playlist = await Playlist.findById(playlistId)

        if(!playlist) {
            throw new ApiError(404, "Playlist not found")
        }
        
        // checking if video already exists in playlist
        const videoExists = playlist.videos.includes(videoId)
        if (videoExists) {
            throw new ApiError(400, "Video already exists in the playlist");
        }



        // adding video to playlist
        playlist.videos.push(videoId)

        await playlist.save()

         res.status(200).json( new ApiResponse(200, playlist, "Video added to playlist successfully"))

    } catch (error) {
        console.error("Error adding video to playlist")
        throw new ApiError(500, "Failed to add video")
    }

    
})

// remove video from playlist
const removeVideoFromPlaylist = asyncHandler(async(req, res) => {
    const { videoId, playlistId } = req.params

    if(!videoId) {
        throw new ApiError(404, "VideoId required")
    }
    if(!playlistId) {
        throw new ApiError(404, "PlaylistId required")
    }

    try {
        const playlist = await Playlist.findById(playlistId)

        if(!playlist) {
            throw new ApiError(404, "Playlist not found")
        }
        
        const videoIndex = playlist.videos.indexOf(videoId);
        if (videoIndex === -1) {
            throw new ApiError(400, "Video doesn't exist in the playlist");
        }

        // Remove the video from the playlist --- videos are stored in array format
        playlist.videos.splice(videoIndex, 1);

        await playlist.save()

         res.status(200).json( new ApiResponse(200, playlist, "Video removed from playlist successfully"))

    } catch (error) {
        console.error("Error removing video from playlist")
        throw new ApiError(500, "Failed to remove video")
    }

    
})

// update playlist

const updatePlaylist = asyncHandler(async(req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body

    if(!name || !description) {
        throw new ApiError(400, "name or description or both are required")
    }

    if(!playlistId) {
        throw new ApiError(404, "PlaylistId required")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description
            }
        },
        { new: true }
    )

    if(!updatedPlaylist) {
        throw new ApiError(404, "Not able to find previoud playlist")
    }

    return res.status(200).json(new ApiResponse(200, updatePlaylist, "Playlist updated successfully"))
})

export { 
    createPlaylist,
    getUserPlaylist,
    getPlaylistById,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    updatePlaylist
 }