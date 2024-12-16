import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client';
import Chat from './Chat';
import Login from './Login';
import Home from './Home';
import { BrowserRouter, Routes, Route } from 'react-router'
import LandingPage from './LandingPage';
import NewChat from './NewChat';

const socket = io('http://localhost:4000')

function App() {
  const [connectedUsers, setConnectedUsers] = useState([])
  const [loggedin, setLoggedIn] = useState('')
  const [privateKey, setPrivateKey] = useState()

  useEffect(() => {
    const userHandler = (users) => {
      setConnectedUsers(users)
    }

    const alertHandler = (alert) => {
      console.log(alert)
      //alert(alert)
    }
    socket.on('alert-message', alertHandler)
    socket.on('connected-users', userHandler)
    return () => {
      socket.off('alert-message', alertHandler)
      socket.off('connected-users', userHandler)
    }
  }, [])

  return (
    <div style={{display: 'flex', justifyContent: 'space-between'}}>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<LandingPage loggedin={loggedin}/>}/>
          <Route path="/home" element={<Home loggedin={loggedin} socket={socket}/>}/>
          <Route path="/chat/:chatid" element={<Chat socket={socket} loggedin={loggedin} connectedUsers={connectedUsers}/>}/>
          <Route path="/login" element={<Login socket={socket} setLoggedIn={setLoggedIn} setPrivateKey={setPrivateKey}/>}/>
          <Route path='/newchat' element={<NewChat socket={socket} loggedin={loggedin} connectedUsers={connectedUsers}/>}/>
        </Routes>
      </BrowserRouter>
      <div>
        {loggedin && 'Welcome, ' + loggedin}
        <div>
          Online Users:
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
