import { useEffect, useState } from 'react'
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth'

export default function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const API_URL = import.meta.env.VITE_API_URL

  useEffect(() => {
    async function fetchUserBookings() {
      try {
        // 1. Get authenticated user ID and active JWT session
        const { userId } = await getCurrentUser()
        const session = await fetchAuthSession()
        const token = session.tokens?.idToken?.toString()

        if (!token) throw new Error('Authentication token missing')

        // 2. Query protected endpoint for user's bookings
        const response = await fetch(`${API_URL}/bookings/${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || `Failed with status ${response.status}`)
        }

        const data = await response.json()
        setBookings(data)
      } catch (err) {
        console.error('Error fetching bookings:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUserBookings()
  }, [API_URL])

  if (loading) return <p style={{ padding: '2rem' }}>Loading your reservation history...</p>
  if (error) return <p style={{ padding: '2rem', color: '#dc3545' }}>Error: {error}</p>

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
      <h2>My Bookings</h2>
      
      {bookings.length === 0 ? (
        <p>No active or past bookings found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bookings.map((booking) => (
            <div 
              key={booking.bookingId} 
              style={{
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '1.25rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>ID: {booking.bookingId}</span>
                <span style={{ 
                  backgroundColor: '#e6f4ea', 
                  color: '#137333', 
                  padding: '0.2rem 0.6rem', 
                  borderRadius: '12px', 
                  fontSize: '0.8rem',
                  fontWeight: 'bold' 
                }}>
                  CONFIRMED
                </span>
              </div>
              <p style={{ margin: '0.3rem 0' }}><strong>Car Reference:</strong> {booking.carId}</p>
              <p style={{ margin: '0.3rem 0' }}>
                <strong>Dates:</strong> {booking.startDate} &rarr; {booking.endDate}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}