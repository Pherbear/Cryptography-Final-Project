import React, { useEffect } from 'react'
import { useNavigate } from 'react-router'

export default function LandingPage({ loggedin }) {
    const navigate = useNavigate()

    useEffect(() => {
        if(loggedin) navigate('/home')
    }, [])

    return (
        <div>
            <button onClick={() => { navigate('/login') }}>login/signup</button>
        </div>
    )
}
