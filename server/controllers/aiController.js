import OpenAI from "openai";
import sql from "../config/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { PDFParse } from "pdf-parse";
// Change this:
// import {v2 as cloudinary} from 'cloudinary'

// console.log("Cloudinary Config Check:", {
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "Loaded ✅" : "Missing ❌",
//     api_key: process.env.CLOUDINARY_API_KEY ? "Loaded ✅" : "Missing ❌",
//     api_secret: process.env.CLOUDINARY_API_SECRET ? "Loaded ✅" : "Missing ❌",
// });
import ImageKit from "imagekit";

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});


const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    // timeout: 60_000,
    // maxRetries: 0,
});


// to generate article
export const generateArticle = async (req, res)  =>  {
    try {
        const {userId} = req.auth();
        const {prompt, length} =req.body
        const plan = req.plan;
        const free_usage = req.free_usage;

        if(plan!== 'premium' && free_usage>=10) {
            return res.json({success:false, message : "Limit reached, Upgrade to continue."})
        }
        

        //using gemini api
        const response = await AI.chat.completions.create({
          model: "gemini-3.6-flash", //gemini-3.8-flash
          messages: [{
            role: "user",
            content:prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: length,
        });

        //getting response from ai
        const content = response.choices[0].message.content

        await sql` INSERT INTO creations (user_id, prompt, content, type) 
        VALUES (${userId}, ${prompt}, ${content}, 'article')`;
        
        // updating free-usage limit if plan is not premium
        if(plan!=='premium') {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            })
        }
        res.json({ success:true, content})


    } catch (error) {
        console.log(error.message)
        res.json({success:false, message:error.message})
    }
}

// to generate blog title
export const generateBlogTitle = async (req, res)  =>  {
    try {
        const {userId} = req.auth();
        const {prompt } =req.body
        const plan = req.plan;
        const free_usage = req.free_usage;
        
        //if user is not premium and free limit is reached
        if(plan!== 'premium' && free_usage>=10) {
            return res.json({success:false, message : "Limit reached, Upgrade to continue."})
        }
        

        //using gemini api
        const response = await AI.chat.completions.create({
          model: "gemini-3.6-flash",
          messages: [{ role: "user", content:prompt, } ],
          temperature: 0.7,
          max_tokens: 600,
        });

        //getting response from ai
        const content = response.choices[0].message.content

        await sql` INSERT INTO creations (user_id, prompt, content, type) 
        VALUES (${userId}, ${prompt}, ${content}, 'blog-title')`;
        
        // updating free-usage limit if plan is not premium
        if(plan!=='premium') {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            })
        }
        res.json({ success:true, content})


    } catch (error) {
        console.log(error.message)
        res.json({success:false, message:error.message})
    }
}

//to generate image
export const generateImage = async (req, res)  =>  {
    try {
        const {userId} = req.auth();
        const {prompt, publish } =req.body
        const plan = req.plan;
        
        //if user is not premium 
        if(plan!== 'premium' ) {
            return res.json({success:false, message : "This feature is only available for premium subscriptions"})
        }

        //to generate image we use clipdropai
        const formData = new FormData()
        formData.append('prompt', prompt)
        const {data} = await axios.post('https://clipdrop-api.co/text-to-image/v1', formData, {
            headers: {'x-api-key': process.env.CLIPDROP_API_KEY,},
            responseType: "arraybuffer",
        })

        const base64Image = `data:image/png;base64,${Buffer.from(data,'binary').toString('base64')}`;

        // console.log("Base64 string preview:", base64Image.substring(0, 50)); 
        // //  const { secure_url } = await cloudinary.uploader.upload(base64Image);

        // const {secure_url}= await cloudinary.uploader.upload(base64Image)
        const uploadResponse = await imagekit.upload({
            file: base64Image, // your base64 string
            fileName: `ai-image-${Date.now()}.png`,
        });

        const secure_url = uploadResponse.url;


        await sql` INSERT INTO creations (user_id, prompt, content, type, publish) 
        VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})`;
        
       
        res.json({ success:true, secure_url})

    } catch (error) {
        console.log(error.message)
        res.json({success:false, message:error.message})
    }
}

//to remove image background 
// export const removeImageBackground = async (req, res)  =>  {
//     try {
//         const {userId} = req.auth();
//         const {image } =req.file
//         const plan = req.plan;
        
//         //if user is not premium 
//         if(plan!== 'premium' ) {
//             return res.json({success:false, message : "This feature is only available for premium subscriptions"})
//         }

        

//         const base64Image = `data:image/png;base64,${Buffer.from(data,'binary').toString('base64')}`;

//         const uploadResponse = await imagekit.upload({
//             file: base64Image, // your base64 string
//             fileName: `ai-image-${Date.now()}.png`,
//         });

//         const secure_url = uploadResponse.url;


//         await sql` INSERT INTO creations (user_id, prompt, content, type, publish) 
//         VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})`;
        
       
//         res.json({ success:true, secure_url})

//     } catch (error) {
//         console.log(error.message)
//         res.json({success:false, message:error.message})
//     }
// }

export const removeImageBackground = async (req, res) => {
    try {
        const { userId } = req.auth();
        const plan = req.plan;
        
        // If user is not premium 
        if (plan !== 'premium') {
            return res.json({ success: false, message: "This feature is only available for premium subscriptions" });
        }

        // Check if an image file was provided via multer (req.file)
        if (!req.file) {
            return res.json({ success: false, message: "No image file provided" });
        }

        // Convert the uploaded file buffer to a base64 string
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        // Upload the image to ImageKit
        const uploadResponse = await imagekit.upload({
            file: base64Image,
            fileName: `bg-removed-${Date.now()}.png`,
            folder: "/background-removals"
        });

        // Append ImageKit's background removal transformation parameter (?tr=e-bgremove)
        const secure_url = `${uploadResponse.url}?tr=e-bgremove`;

        // Save the creation details to your PostgreSQL database
        await sql` INSERT INTO creations (user_id, prompt, content, type) 
        VALUES (${userId}, 'Remove Background from image', ${secure_url}, 'image')`;
        
        res.json({ success: true, content: secure_url });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

//to remove object from image
export const removeImageObject = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt } = req.body; // e.g., "remove the red car" or "remove the person in the background"
        const plan = req.plan;
        
        // If user is not premium 
        if (plan !== 'premium') {
            return res.json({ success: false, message: "This feature is only available for premium subscriptions" });
        }

        // Check if an image file was provided
        if (!req.file) {
            return res.json({ success: false, message: "No image file provided" });
        }

        // Check if a prompt was provided
        if (!prompt) {
            return res.json({ success: false, message: "Please provide a prompt specifying the object to remove." });
        }

        // Convert the uploaded file buffer to a base64 string
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        // Upload the image to ImageKit
        const uploadResponse = await imagekit.upload({
            file: base64Image,
            fileName: `object-removal-${Date.now()}.png`,
            folder: "/object-removals"
        });

        // Construct the AI prompt transformation parameter for ImageKit
        // Using ImageKit's e-edit transformation syntax with a prompt to remove the requested object
        const encodedPrompt = encodeURIComponent(`remove ${prompt}`);
        const secure_url = `${uploadResponse.url}?tr=e-edit-prompt-${encodedPrompt}`;

        // Save the creation details to your PostgreSQL database
        await sql` INSERT INTO creations (user_id, prompt, content, type) 
        VALUES (${userId}, ${`Removed ${prompt} from image`}, ${secure_url}, 'image')`;
        
        res.json({ success: true, content:secure_url });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

//to review resume
export const resumeReview = async (req, res) => {
    try {
        const { userId } = req.auth();
        const resume = req.file;
        const plan = req.plan;
        
        // If user is not premium 
        if (plan !== 'premium') {
            return res.json({ success: false, message: "This feature is only available for premium subscriptions" });
        }

        if (!resume) {
            return res.status(400).json({ success: false, message: "No resume file provided" });
        }

        if (resume.mimetype !== "application/pdf") {
            return res.status(400).json({ success: false, message: "Please upload a PDF resume" });
        }

        if (resume.size > 5 * 1024 * 1024) {
            return res.status(400).json({ success: false, message: "Resume file size exceeds allowed file size (5MB)" });
        }

        const parser = new PDFParse({ data: resume.buffer });
        let pdfData;
        try {
            pdfData = await parser.getText();
        } finally {
            await parser.destroy();
        }

        const prompt = `Review the following resume and provide constructive feedback on its strengths, weaknesses, and areas for improvement. Resume Content:\n\n${pdfData.text}`;

        const response = await AI.chat.completions.create({
          model: "gemini-3.6-flash",
          messages: [{
            role: "user",
            content:prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });

        //getting response from ai
        const content = response.choices[0].message.content



        // Save the creation details to your PostgreSQL database
        await sql` INSERT INTO creations (user_id, prompt, content, type) 
        VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review')`;
        
        res.json({ success: true, content });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}