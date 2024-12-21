import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import forge from 'node-forge'

export default function Login({ socket, setLoggedIn, setKeyPair, setDigSigKeyPair }) {

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [togglePage, setTogglePage] = useState(true)
  const [digSig, setDigSig] = useState('')
  const digSigRef = useRef(digSig)

  const navigate = useNavigate()

  const generateKeyPair = async () => {
    const keyPair = await window.crypto.subtle.generateKey({
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    }, true, ["encrypt", "decrypt"]);

    return keyPair
  }

  const generateDigSigKey = async (digSig) => {
    console.log(digSigRef.current)
    if (digSigRef.current == 'RSA') {
      const rsaKeyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: { name: "SHA-256" },
        },
        true,
        ["sign", "verify"]
      );
      return {...rsaKeyPair, type: 'RSASSA-PKCS1-v1_5'};
    } else if (digSigRef.current === 'DSA') {
      const dsa = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
      return {...dsa, type: 'DSA'};
    }
  }

  const onLoginSuccess = async (message) => {
    try {
      setKeyPair(await generateKeyPair())
      const DigSigKeyPair = await generateDigSigKey()
      setDigSigKeyPair(DigSigKeyPair)
    } finally {
      setLoggedIn(message)
      navigate('/')
    }
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
    console.log(digSig)
    if (digSig) {
      const id = socket.id
      const login = {
        id,
        username,
        password
      }
      socket.emit('login-request', login)
    } else {
      alert('Algorithm Required')
    }
  }

  const handleSignup = (e) => {
    if (digSig) {
      const id = socket.id
      const signup = {
        id,
        username,
        password
      }
      socket.emit('account-create', signup)
    } else {
      alert('Algorithm Required')
    }
  }

  const handleTogglePage = () => {
    setTogglePage(!togglePage)
  }

  const handleAlgorithm = (e) => {
    if (e.target.value == 'on') {
      const algo = `${e.target.id}`
      setDigSig(() => {
        if (algo == 'RSA') return 'RSA'
        else if (algo == 'DSA') return 'DSA'
      })
      digSigRef.current = algo
    }
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
      <div>
        <h2>Digital Signature Algorithm:</h2>
        <input type='radio' id='DSA' name='algo' onChange={(e) => handleAlgorithm(e)} />
        <label for="css">DSA Algorithm</label>
        <input type='radio' id='RSA' name='algo' onChange={(e) => handleAlgorithm(e)} />
        <label for="css">RSA Algorithm</label>
      </div>
    </div>
  )
}
