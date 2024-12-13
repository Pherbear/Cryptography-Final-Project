import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

export default function Home({ loggedin, socket }) {
    const [invite, setInvite] = useState()
    const navigate = useNavigate()
    useEffect(() => {
        if (!loggedin) navigate('/')
        
        const handleInvite = ({chatId}) => {
            //insert invite logic here
            console.log(chatId)
        }
        socket.on('chat-invite', handleInvite)
        return () => {
            socket.off('chat-invite', handleInvite)
        }
    }, [])

  return (
    <div>
        <div>
            <button onClick={() => navigate('/newchat')}>Start New Chat</button>
        </div>
        <div>
            <div>example name, has invited you to chat.</div>
            <button>join example name chat</button>
        </div>
    </div>
  )
}
