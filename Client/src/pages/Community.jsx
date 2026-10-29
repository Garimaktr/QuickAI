import React, { useEffect, useRef, useState } from 'react'
import { useUser, useAuth } from '@clerk/react'
import { Heart } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL

const Community = () => {
  const [creations, setCreations] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingLikeIds, setPendingLikeIds] = useState(() => new Set())
  const pendingLikeIdsRef = useRef(new Set())
  const { user } = useUser()
  const { getToken } = useAuth()
  const userId = user?.id

  const fetchCreations = async () => {
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Could not get an authentication token.')
      }

      const { data } = await axios.get('/api/user/get-published-creations', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (data.success) {
        setCreations(data.creations)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const imageLikeToggle = async (creation) => {
    const { id } = creation
    if (!userId || pendingLikeIdsRef.current.has(id)) return

    pendingLikeIdsRef.current.add(id)
    setPendingLikeIds(new Set(pendingLikeIdsRef.current))

    const previousLikes = creation.likes ?? []
    const wasLiked = previousLikes.includes(userId)
    const optimisticLikes = wasLiked
      ? previousLikes.filter((likeId) => likeId !== userId)
      : [...previousLikes, userId]

    setCreations((currentCreations) =>
      currentCreations.map((item) =>
        item.id === id ? { ...item, likes: optimisticLikes } : item
      )
    )

    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Could not get an authentication token.')
      }

      const { data } = await axios.post('/api/user/toggle-like-creation', { id }, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (data.success) {
        toast.success(data.message)
      } else {
        setCreations((currentCreations) =>
          currentCreations.map((item) =>
            item.id === id ? { ...item, likes: previousLikes } : item
          )
        )
        toast.error(data.message)
      }
    } catch (error) {
      setCreations((currentCreations) =>
        currentCreations.map((item) =>
          item.id === id ? { ...item, likes: previousLikes } : item
        )
      )
      toast.error(error.message)
    } finally {
      pendingLikeIdsRef.current.delete(id)
      setPendingLikeIds(new Set(pendingLikeIdsRef.current))
    }
  }

  useEffect(() => {
    if (user) {
      fetchCreations()
    }
  }, [user])

  if (loading) {
    return (
      <div className='flex justify-center items-center h-full'>
        <span className='w-10 h-10 my-1 rounded-full border-3 border-primary border-t-transparent animate-spin' />
      </div>
    )
  }

  return (
    <div className='flex-1 h-full flex flex-col gap-4 p-6'>
      Creations
      <div className='bg-white h-full rounded-xl overflow-y-auto'>
        <div className='grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3'>
          {creations.map((creation) => {
            const isLiked = userId ? creation.likes.includes(userId) : false

            return (
              <div key={creation.id} className='relative aspect-square overflow-hidden rounded-xl group cursor-pointer'>
                <img
                  src={creation.content}
                  alt={creation.prompt}
                  className='absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                />
                <div className='absolute inset-0 flex items-end justify-between gap-3 rounded-xl bg-gradient-to-t from-black/75 via-black/15 to-transparent p-3 text-white transition-colors duration-300 group-hover:from-black/90'>
                  <p className='line-clamp-3 text-sm font-medium drop-shadow-md'>{creation.prompt}</p>
                  <button
                    type='button'
                    onClick={() => imageLikeToggle(creation)}
                    disabled={pendingLikeIds.has(creation.id)}
                    aria-label={isLiked ? 'Unlike creation' : 'Like creation'}
                    aria-pressed={isLiked}
                    className='flex shrink-0 items-center gap-1'
                  >
                    <span>{creation.likes.length}</span>
                    <Heart className={`h-5 w-5 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-white hover:fill-red-500 hover:text-red-500'}`} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Community
