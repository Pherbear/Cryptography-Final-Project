import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

export default function Login({ socket }) {

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const navigate = useNavigate()

  const onLoginSuccess = () => {
    navigate('/')
  }

  useEffect(() => {  
    socket.on('login-success', (message) => {
      console.log(message)
      onLoginSuccess()
    })  
  }, [])

  const handleLogin = async (e) => {
    const sessionId = socket.id

    const login = {
      sessionId,
      username, 
      password
    }
    
    console.log(socket)
    socket.emit('login-request', login)
  }


  return (
    <div>
      <h1>Login</h1>
      <div>
        <label for="username">Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} type="text" id="username" name="username" placeholder="Enter your username" required/>
      </div>
      <div>
        <label for="password">Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" id="password" name="password" placeholder="Enter your password" required/>
      </div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={() => navigate('/signup')}>Create Account</button>
    </div>
  )
}
