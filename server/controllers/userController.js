import sql from "../config/db.js"

//to get all user creations
export const getUserCreations = async (req, res) => {
    try {
        const { userId } = req.auth()

        const creations = await sql`SELECT * FROM creations WHERE user_id = ${userId} ORDER BY created_at DESC`;

        res.json({ success: true, creations })

    } catch (error) {
        console.error("Failed to get user creations:", error)
        res.status(500).json({ success: false, message: error.message })
    }
}

//to get published creations
export const getPublishedCreations = async (req, res) => {
    try {
        const creations = await sql`SELECT * FROM creations WHERE publish = true ORDER BY created_at DESC`;

        res.json({ success: true, creations })

    } catch (error) {
        console.error("Failed to get published creations:", error)
        res.status(500).json({ success: false, message: error.message })
    }
}

//to dislike or like any creation(toggle func)
export const toggleLikeCreation = async (req, res) => {
    try {
        const { userId } = req.auth()
        const { id } = req.body

        if (!id) {
            return res.status(400).json({ success: false, message: "Creation ID is required" })
        }

        const [creation] = await sql`
            UPDATE creations
            SET likes = CASE
                WHEN ${userId} = ANY(COALESCE(likes, ARRAY[]::text[]))
                    THEN array_remove(COALESCE(likes, ARRAY[]::text[]), ${userId})
                ELSE array_append(COALESCE(likes, ARRAY[]::text[]), ${userId})
            END
            WHERE id = ${id}
            RETURNING likes
        `
        if(!creation) {
            return res.status(404).json({ success: false, message: "Creation not found" })
        }

        const liked = creation.likes.includes(userId)
        res.json({ success: true, message: liked ? "Creation Liked" : "Creation Unliked" })

    } catch (error) {
        console.error("Failed to toggle creation like:", error)
        res.status(500).json({ success: false, message: error.message })
    }
}