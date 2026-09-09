import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('checking backend...')

  useEffect(() => {
    fetch('http://127.0.0.1:8000/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('backend unreachable'))
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg">Backend status: {status}</p>
    </div>
  )
}

export default App
