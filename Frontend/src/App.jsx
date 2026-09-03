import { useEffect, useState } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { useAuthenticator, Authenticator } from '@aws-amplify/ui-react'
import MyBookings from './components/MyBookings'

function App() {
  const { user, signOut } = useAuthenticator((context) => [context.user])
  
  // Navigation & Catalog State
  const [currentView, setCurrentView] = useState('catalog')
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Booking Modal State
  const [selectedCar, setSelectedCar] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL

  useEffect(() => {
    fetch(`${API_URL}/cars`)
      .then((res) => res.json())
      .then((data) => {
        setCars(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching cars:', err)
        setLoading(false)
      })
  }, [API_URL])

  const handleBookClick = (car) => {
    setSelectedCar(car)
    if (!user) {
      setShowAuthModal(true)
    }
  }

  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString()

      if (!token) throw new Error('Authentication token missing')

      const response = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          carId: selectedCar.carId,
          startDate,
          endDate,
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || `HTTP error ${response.status}`)
      }

      alert(`Booking confirmed for ${selectedCar.make} ${selectedCar.model}!`)
      setSelectedCar(null)
      setStartDate('')
      setEndDate('')
      setCurrentView('bookings')
    } catch (err) {
      console.error('Booking error:', err)
      alert(`Booking failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Navigation Header */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 2rem', backgroundColor: '#ffffff', borderBottom: '1px solid #e9ecef'
      }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: '#333' }}>DriveSelect Rentals</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setCurrentView('catalog')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem',
                fontWeight: currentView === 'catalog' ? 'bold' : 'normal',
                color: currentView === 'catalog' ? '#0066cc' : '#555'
              }}
            >
              Catalog
            </button>
            {user && (
              <button 
                onClick={() => setCurrentView('bookings')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem',
                  fontWeight: currentView === 'bookings' ? 'bold' : 'normal',
                  color: currentView === 'bookings' ? '#0066cc' : '#555'
                }}
              >
                My Bookings
              </button>
            )}
          </div>
        </div>

        <div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#555' }}>
                Signed in as: <strong>{user.signInDetails?.loginId || user.username}</strong>
              </span>
              <button 
                onClick={signOut}
                style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #dc3545', color: '#dc3545', background: 'none', cursor: 'pointer' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              style={{ padding: '0.5rem 1.2rem', borderRadius: '4px', backgroundColor: '#0066cc', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Sign In / Sign Up
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main>
        {currentView === 'catalog' ? (
          <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
            <h1>Available Vehicles</h1>
            {loading ? (
              <p>Loading available cars...</p>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {cars.map((car) => (
                  <div key={car.carId} style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
                    <h3>{car.make} {car.model}</h3>
                    <p><strong>Year:</strong> {car.year}</p>
                    <p><strong>Rate:</strong> ${car.dailyRate}/day</p>
                    <button 
                      onClick={() => handleBookClick(car)}
                      style={{ width: '100%', padding: '0.6rem', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Book This Car
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <MyBookings />
        )}
      </main>

      {/* Auth Modal */}
      {showAuthModal && !user && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1rem', position: 'relative' }}>
            <button 
              onClick={() => setShowAuthModal(false)}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
            >
              ✕
            </button>
            <Authenticator />
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      {selectedCar && user && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
            <h2>Confirm Booking: {selectedCar.make} {selectedCar.model}</h2>
            <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem' }}>Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem' }}>End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setSelectedCar(null)} style={{ flex: 1, padding: '0.6rem', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '0.6rem', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {isSubmitting ? 'Confirming...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App