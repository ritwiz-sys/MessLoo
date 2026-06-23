import { useAuth, UserButton } from '@clerk/react'
import { useEffect, useState } from 'react'

function App() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (isSignedIn) {
      syncUser()
    }
  }, [isSignedIn])

  const syncUser = async () => {
    const token = await getToken()

    const response = await fetch('http://localhost:3000/users/sync', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        college_id: '22BCE1234',
        block_id: null,
        role: 'student'
      })
    })

    const data = await response.json()
    setUser(data.data)
    console.log('User synced:', data)
  }

  if (!isLoaded) return <div>Loading...</div>

  if (!isSignedIn) return <div>Please sign in</div>

  return (
    <div>
      <h1>Welcome to MessLoo</h1>
      <UserButton />
      {user && <p>Logged in as: {user.name}</p>}
    </div>
  )
}

export default App