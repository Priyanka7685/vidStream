import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"


// login
const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        if(!user) {
            throw new ApiError(404, "User not found")
        }
    
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken
        await user.save({ validBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token" )
    }
}

// Registration of user
const registerUser =  asyncHandler(async (req, res) => {
    const {fullname, email, username, password} = req.body

    // validation
    if(
        [fullname, username, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
        
    }

    // access to files--get photos
    console.warn(req.files)
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverLocalPath = req.files?.coverImage?.[0]?.path

    if(!avatarLocalPath) {
        throw new ApiError(402, "Avatar file is missing")
    }

    // const avatar = await uploadOnCloudinary(avatarLocalPath)
    // let coverImage = ""
    // if (coverLocalPath) {
    //     await uploadOnCloudinary(coverLocalPath)
    // }

    let avatar;
    try {
      avatar =  await uploadOnCloudinary(avatarLocalPath)
      console.log("Uploaded avatar", avatar);
      
    } catch (error) {
        console.log("Error uploading avatar", error);
        throw new ApiError(500, "Failed to load avatar")
        
    }


    let coverImage;
    try {
      coverImage =  await uploadOnCloudinary(coverLocalPath)
      console.log("Uploaded avatar", coverImage);
      
    } catch (error) {
        console.log("Error uploading coverImage", error);
        throw new ApiError(500, "Failed to load coverImage")
        
    }

    // saving in mongodb atlas
    try {
    const user =  await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // to remove fields
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken "
    )
   
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering a user")
        
    }

    return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"))
} catch(error) {
    console.log("User creation failed", error);

    if(avatar) {
        await deleteFromCloudinary(avatar.public_id)
    }
    if(coverImage) {
        await deleteFromCloudinary(coverImage.public_id)
    }

    throw new ApiError(500, "Something went wrong and images were deleted")
    
}

})

const loginUser = asyncHandler( async(req, res) => {
    // get data from body
    const {email, username, password} = req.body    
    

    // validation
    if(!email && !username) {
        throw new ApiError(400, "Username or Email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(!user) {
        throw new ApiError(404, "User not found")
    }

    // validate password
    // console.log("Plain = ", password);
    // console.log("Hashed = ", user.password);
    
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) {
        throw new ApiError(404, "Password not matched")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json( new ApiResponse(
        200, 
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
    ))
})

const logoutUser = asyncHandler( async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { 
            $set: {
                refreshToken: undefined,
            }
        },
        {new: true}
    )

    const options = { 
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.ACCESS_REFRESH_SECRET
        )
        const user = await User.findById(decodedToken?._id)

        if(!user) {
            throw new ApiError(401, "Invalid refresh token")
        }


        if(incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invalid refresh token")
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        }

         const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id)

         return res
         .status(200)
         .cookie("accessToken", accessToken, options)
         .cookie("refreshToken", newRefreshToken, options)
         .json(
            new ApiResponse(
                200,
                { accessToken, 
                    refreshToken: newRefreshToken
                },
                "Access token refreshed successfully"
            ))

    } catch (error) {
        throw new ApiError(500, "Something went wrong while refreshing access token")
    }

})

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid) {
        throw new ApiError(401, "Old password is incorrect")
    }

    user.password = newPassword

    await user.save({ validBeforeSave: false })

    return res.status(200).json( new ApiResponse(200, {}, "Password changed successfully"))

})


const getCurrentUser = asyncHandler( async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "Current user details"))
})


const updateAccountDetails = asyncHandler( async (req, res) => {
    const { fullname, email } = req.body

    if(!fullname || !email) {
        throw new ApiError(400, "Fullname and email are required")
    }

    let user
    try {
         user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: { 
                    fullname,
                    email
                }
            },
            { new: true }
        ).select("-password -refreshToken")
    
        if(!user) {
            throw new ApiError(404, "User not found")
        }
    
        // console.log("Updated user: ", user)
    
        return res.status(200).json( new ApiResponse(200, user, "Account details updated successfully"))
    } catch (error) {
        throw new ApiError(200, "Error in updating user details")
    }

})



const updateUserAvatar = asyncHandler( async (req, res) => {
   const avatarLocalPath = req.file?.path    // here we are taking just one file

   if(!avatarLocalPath) {
    throw new ApiError(400, "File is required")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath)

   if(!avatar.url) {
    throw new ApiError(500, "Something went wrong while uploading avatar")
   }

   const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set: {
            avatar: avatar.url
        }
    },
    {new:true}
   ).select("-password -refreshToken")

   res.status(200).json( new ApiResponse(200, user, "Avatar updated successfully"))
})


const updateUserCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath) {
        throw new ApiError(400, "File is required")
       }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage) {
        throw new ApiError(500, "Something went wrong while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200).json( new ApiResponse(200, user, "Cover image update successfully"))

})


// aggregation pipelines
const getUserChannelProfile = asyncHandler( async(req, res) => {
    const {username} = req.params

    if(!username?.trim()) {
        throw new ApiError(400, "Username is required")
    }

    const channel = await User.aggregate(
        [
            {
                $match: {
                    username: username?.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                $addFields: {
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    channelsSubscibedToCount:{
                        $size: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: {
                                $in: [req.user?._id, "$subscribers.subscriber"] 
                            },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                // project only the necessary data
                $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                    subscribersCount: 1,
                    channelsSubscibedToCount: 1,
                    isSubscribed: 1,
                    coverImage: 1,
                    email: 1
                }
            }
        ]
    )

    if(!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }

    return res.status(200).json( new ApiResponse(
        200,
        channel[0],
        "Channel profile fetched successfully"
    ))

})


const getWatchHistory = asyncHandler( async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                },
                                {
                                    $addFields: {
                                        owner: {
                                            $first: "owner"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json( new ApiResponse(200, user[0]?.watchHistory, 
        "Watch history fetched successfully"
    ))
})



export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}