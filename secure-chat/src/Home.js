import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

export default function Home({ loggedin, socket }) {
    const [invite, setInvite] = useState()
    const navigate = useNavigate()
    useEffect(() => {
        if (!loggedin) navigate('/')
        
        const handleInvite = ({chatId, hostName}) => {
            //insert invite logic here
            setInvite({chatId, hostName})
        }
        socket.on('chat-invite', handleInvite)
        return () => {
            socket.off('chat-invite', handleInvite)
        }
    }, [])

    const handleJoinChat = () => {
        navigate(`/chat/${invite.chatId}`)
    }

  return (
    <div>
        <div>
            <button onClick={() => navigate('/newchat')}>Start New Chat</button>
        </div>
        {invite && <div>
            <div>{invite.hostName}, has invited you to chat.</div>
            <button onClick={handleJoinChat}>join chat</button>
        </div>}
    </div>
  )
}
