import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

export default function Signup({ socket }) {

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const navigate = useNavigate()

  const onAccountSuccess = () => {
    navigate('/')
  }

  useEffect(() => {  
    socket.on('login-success', (message) => {
      console.log(message)
      onAccountSuccess()
    })  
  }, [])

  const handleSignup = (e) => {
    const sessionId = socket.id

    const signup = {
      sessionId,
      username, 
      password
    }
    
    console.log(socket)
    socket.emit('account-create', signup)
  }


  return (
    <div>
      <h1>Sign Up</h1>
      <div>
        <label for="username">Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} type="text" id="username" name="username" placeholder="Enter your username" required/>
      </div>
      <div>
        <label for="password">Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" id="password" name="password" placeholder="Enter your password" required/>
      </div>
      <div>
        <label for="confirmpassword">Password</label>
        <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" id="confirmpassword" name="confirmpassword" placeholder="Confirm your password" required/>
      </div>
      <button onClick={handleSignup}>Login</button>
    </div>
  )
}
