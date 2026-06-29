import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Services from './pages/Services.jsx'
import Galerie from './pages/Galerie.jsx'
import Contact from './pages/Contact.jsx'
import Reservation from './pages/Reservation.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/galerie" element={<Galerie />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/reservation" element={<Reservation />} />
        <Route path="/espace-oa" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
