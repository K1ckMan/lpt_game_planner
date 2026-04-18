import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import ProfileSetup from './pages/ProfileSetup'
import LeagueSelect from './pages/LeagueSelect'
import DivisionSelect from './pages/DivisionSelect'
import Division from './pages/Division'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/leagues" element={<ProtectedRoute><LeagueSelect /></ProtectedRoute>} />
          <Route path="/leagues/:league" element={<ProtectedRoute><DivisionSelect /></ProtectedRoute>} />
          <Route path="/leagues/:league/divisions/:division" element={<ProtectedRoute><Division /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/leagues" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
