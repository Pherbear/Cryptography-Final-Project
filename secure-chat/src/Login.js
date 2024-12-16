import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

export default function Login({ socket, setLoggedIn, setPrivateKey }) {

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [togglePage, setTogglePage] = useState(true)

  const navigate = useNavigate()

  const generateKeyPair = async () => {
    const keyPair = await window.crypto.subtle.generateKey({
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    }, true, ["encrypt", "decrypt"]);

    const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  }

  const onLoginSuccess = (message) => {
    setLoggedIn(message)
    navigate('/')
  }
  const onLoginFailure = (message) => {
    alert(message)
  }

  useEffect(() => {
    socket.on('login-success', onLoginSuccess)
    socket.on('login-failure', onLoginFailure)

    return () => {
      socket.off('login-success', onLoginSuccess)
      socket.off('login-failure', onLoginFailure)
    }
  }, [])

  const handleLogin = async (e) => {
    const id = socket.id
    const login = {
      id,
      username,
      password
    }
    socket.emit('login-request', login)
  }

  const handleSignup = (e) => {
    const id = socket.id
    const signup = {
      id,
      username,
      password
    }
    socket.emit('account-create', signup)
  }

  const handleTogglePage = () => {
    setTogglePage(!togglePage)
  }

  return (
    <div>
      {togglePage ?
        <div>
          <h1>Login</h1>
          <div>
            <label for="username">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} type="text" id="username" name="username" placeholder="Enter your username" required />
          </div>
          <div>
            <label for="password">Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" id="password" name="password" placeholder="Enter your password" required />
          </div>
          <button onClick={handleLogin}>Login</button>
          <button onClick={handleTogglePage}>Sign Up</button>
        </div>
        :
        <div>
          <h1>Sign Up</h1>
          <div>
            <label for="username">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} type="text" id="username" name="username" placeholder="Enter your username" required />
          </div>
          <div>
            <label for="password">Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" id="password" name="password" placeholder="Enter your password" required />
          </div>
          <div>
            <label for="confirmpassword">Confirm Password</label>
            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" id="confirmpassword" name="confirmpassword" placeholder="Confirm your password" required />
          </div>
          <button onClick={handleSignup}>Confirm new Account</button>
          <button onClick={handleTogglePage}>Back to Login</button>
        </div>
      }

    </div>
  )
}
