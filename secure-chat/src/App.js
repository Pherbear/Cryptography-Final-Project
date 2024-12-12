import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client';
import Chat from './Chat';
import Login from './Login';
import { BrowserRouter, Routes, Route } from 'react-router'

const socket = io('http://localhost:4000')

function App() {
  const [connectedUsers, setConnectedUsers] = useState([])
  const [loggedin, setLoggedIn] = useState('')
  
  useEffect(() => {
    const userHandler = (users) => {
      setConnectedUsers(users)
      console.log(users)
    }

    socket.on('connected-users', userHandler)

    return () => {
      socket.off('connected-users', userHandler)
    }
  }, [])

  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Chat socket={socket} loggedin={loggedin}/>}/>
          <Route path="/login" element={<Login socket={socket} setLoggedIn={setLoggedIn}/>}/>
        </Routes>
      </BrowserRouter>
      <div>
        <div>
          Connected Users:
        </div>
        <div>
          {connectedUsers.map((user) => {
            return <div>{user.username && user.username}</div>
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
