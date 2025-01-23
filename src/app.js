import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true
    })
)

// common middleware
app.use(express.json({
    limit:"16kb"
}))
app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))
app.use(express.static("public"))
app.use(cookieParser())

// import routes
import healthCheckRouter from "./routes/healthCheck_routes.js"   //route to get reliable response
import { errorHandler } from "./middlewares/error.middlewares.js"//route to handle all errors
import userRouter from "./routes/user.routes.js"    //route for user registration
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comments.routes.js"


// routes -- we have to go through this route to reach on any route like--- register, login, etc

app.use("/api/v1/healthCheck", healthCheckRouter)

app.use("/api/v1/users", userRouter)

app.use("/api/v1/videos", videoRouter)

app.use("/api/v1/comments", commentRouter)

app.use(errorHandler)

export { app }