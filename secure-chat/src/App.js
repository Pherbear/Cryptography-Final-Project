import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client';
import Chat from './Chat';
import Login from './Login';
import Home from './Home';
import { BrowserRouter, Routes, Route } from 'react-router'
import LandingPage from './LandingPage';
import NewChat from './NewChat';
import forge from "node-forge";

const socket = io('http://localhost:4000')

function App() {
  const [connectedUsers, setConnectedUsers] = useState([])
  const [loggedin, setLoggedIn] = useState('')
  const [keyPair, setKeyPair] = useState()
  const [digSigKeyPair, setDigSigKeyPair] = useState()

  useEffect(() => {
    const userHandler = (users) => {
      setConnectedUsers(users)
      console.log(users)
    }
    const alertHandler = (alert) => {
      console.log(alert)
    }
    socket.on('alert-message', alertHandler)
    socket.on('connected-users', userHandler)
    return () => {
      socket.off('alert-message', alertHandler)
      socket.off('connected-users', userHandler)
    }
  }, [])

  useEffect(() => {
    const exportKey = async (publicKey) => {
      const exportedKey = await window.crypto.subtle.exportKey("spki", publicKey)
      const base64Key = btoa(String.fromCharCode(...new Uint8Array(exportedKey)))
      socket.emit('public-key', base64Key)
    }
    if (keyPair) {
      const { publicKey } = keyPair
      if (publicKey) exportKey(publicKey)
    }
  }, [keyPair])

  useEffect(() => {
    const exportKey = async (publicKey) => {
      console.log(publicKey)
      let exportedData
      if (publicKey.algorithm) {
        const exportedKey = await window.crypto.subtle.exportKey("spki", publicKey)
        const base64Key = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
        exportedData = {base64Key, type: publicKey.algorithm.name}
      } else {
        const pem = forge.pki.publicKeyToPem(publicKey);
        exportedData = {
          pem,
          type: 'DSA'
        }
      }
      socket.emit('digsig-public-key', exportedData)
    }
    if (digSigKeyPair) {
      const { publicKey } = digSigKeyPair
      if (publicKey) exportKey(publicKey)
    }
  }, [digSigKeyPair])

  return (
    <div style={{display: 'flex', justifyContent: 'space-between'}}>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<LandingPage loggedin={loggedin}/>}/>
          <Route path="/home" element={<Home loggedin={loggedin} socket={socket}/>}/>
          <Route path="/chat/:chatid" element={<Chat socket={socket} loggedin={loggedin} connectedUsers={connectedUsers} keyPair={keyPair} digSigKeyPair={digSigKeyPair}/>}/>
          <Route path="/login" element={<Login socket={socket} setLoggedIn={setLoggedIn} setKeyPair={setKeyPair} setDigSigKeyPair={setDigSigKeyPair}/>}/>
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
