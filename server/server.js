//main file of server folder

import express from 'express'
import cors from 'cors'
import 'dotenv/config' 
import { clerkMiddleware } from '@clerk/express'
import aiRouter from './routes/aiRoutes.js';
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoutes.js';



const app=express();

await connectCloudinary()

//app.use(cors())  //all th erequest will be passed htrough cors
app.use(cors({
  origin: 'https://quick-ai-xdb5.vercel.app',
  credentials: true
}));
app.use(express.json())
app.use(clerkMiddleware()) //all the requests should be passed using clerk middleware
//The clerkMiddleware() function checks the request's cookies and headers for a session JWT and, if found, attaches the Auth object to the request object under the auth key.

// Add this route in server.js
app.get('/favicon.ico', (req, res) => res.status(204).end());

//when we will hit this route the corresponding funtion will be executed
app.get('/',(req, res) => res.send("Server is Live!"))  
const PORT=process.env.PORT || 3000

app.use('/api/ai', aiRouter)
app.use('/api/user', userRouter)



if (!process.env.VERCEL) {
    app.listen(PORT, ()=>{
        console.log("Server is running on port",PORT);
    })
}

export default app