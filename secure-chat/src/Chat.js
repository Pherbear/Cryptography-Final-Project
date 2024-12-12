import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

export default function Chat({ socket, loggedin }) {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')

    const navigate = useNavigate()
  
    useEffect(() => {
      const messageHandler = (msg) => {
        console.log(msg)
        setMessages((prev) => [...prev, msg])
      }

      const chatFailureHandler = (error) => {
        alert(error)
      }
  
      socket.on('message', messageHandler)
      socket.on('chat-failure', chatFailureHandler)

      return () => {
        socket.off('message', messageHandler)
        socket.off('chat-failure', chatFailureHandler)
      }
    }, [])
  
    const sendMessage = () => {
      if (input.trim()) {
        socket.emit('message', input)
        setInput('')
      }
    }

  return (
    <div>
        {loggedin? 'logged in as ' + loggedin : <button onClick={() => {navigate('/login')}}>login/signup</button>}
        <h1>React with Socket.IO</h1>
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
