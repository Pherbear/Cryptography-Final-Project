import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

export default function Chat({ socket, loggedin }) {
    const [messages, setMessages] = useState([])
    const [chatinfo, setChatinfo] = useState()
    const [input, setInput] = useState('')

    const navigate = useNavigate()
    const { chatid } = useParams()
    
    useEffect(() => {
      const messageHandler = (msg) => {
        console.log(msg)
        setMessages((prev) => [...prev, msg])
      }
      
      const chatFailureHandler = (error) => {
        alert(error)
      }
      
      const requestChatInfoHandler = (info) => {
        setChatinfo(info)
        console.log(info)
        socket.off('chat-info', requestChatInfoHandler)
      }

      const chatExitHandler = () => {
        navigate('/home')
      }

      socket.emit('chat-request', chatid)
      
      socket.on('chat-info', requestChatInfoHandler)
      socket.on('chat-exit', chatExitHandler)
      socket.on('message', messageHandler)
      socket.on('chat-failure', chatFailureHandler)
      
      return () => {
        socket.off('chat-exit', chatExitHandler)
        socket.off('message', messageHandler)
        socket.off('chat-failure', chatFailureHandler)
      }
    }, [])
  
    const sendMessage = () => {
      if (input.trim()) {
        const messageData = {
          chatid,
          input
        }
        socket.emit('message', messageData)
        setInput('')
      }
    }

  return (
    <div>
        {!loggedin && <button onClick={() => {navigate('/login')}}>login/signup</button>}
        <h1>React with Socket.IO</h1>
        <h2>{chatinfo && chatinfo.chatName}</h2>
        <div>
          {messages.map((msg, idx) => (
            <p key={idx}>{msg.user}: {msg.text}</p>
          ))}
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
    </div>
  )
}
