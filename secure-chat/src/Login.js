import React, { useState } from 'react'

export default function Login() {

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = (e) => {
    const login = {username, password}
    console.log(login)
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
    </div>
  )
}
