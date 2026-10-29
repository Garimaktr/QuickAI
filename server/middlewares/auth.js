// Middleware to check user id and has user plan

import { clerkClient } from "@clerk/express"

export const auth = async ( req, res , next) => {
    try{ //get userid and has property from request auth
          const  {userId , has} = await req.auth()
          const hasPremiumPlan = await has({plan: "premium"})

          const user = await clerkClient.users.getUser(userId)
          if(!hasPremiumPlan && user.privateMetadata.free_usage) {
            req.free_usage =user.privateMetadata.free_usage
          } else {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: 0
                }
            })
            req.free_usage=0;
          }
          req.plan = hasPremiumPlan ? 'premium' : 'free'
          next()
    } catch(error) {
        res.json({ success:false, message: error.message })
    }
}