import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home.tsx'
import BartClicker from './pages/BartClicker.tsx'
import ClipDesMonats from './pages/ClipDesMonats.tsx'
import ClipDesJahres from './pages/ClipDesJahres.tsx'
import StreamPlan from './pages/StreamPlan.tsx'
import StreamElements from './pages/StreamElements.tsx'
import Impressum from './pages/Impressum.tsx'
import Datenschutz from './pages/Datenschutz.tsx'
import OfflinePage from './pages/Offline.tsx'
import Footer from './components/Footer.tsx'
import CookieBanner from './components/CookieBanner.tsx'

export default function App() {
  return (
    <div>
      <header style={{padding: '1rem', borderBottom: '1px solid #333', background: '#070607'}}>
        <nav style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <Link to="/">Home</Link>
          <Link to="/streamplan">Streamplan</Link>
          <Link to="/streamelements">StreamElements</Link>
          <Link to="/clipdesmonats">Clip des Monats</Link>
          <Link to="/clipdesjahres">Clip des Jahres</Link>
          <Link to="/games/bartclicker.html" target="_blank" rel="noopener">Bartclicker (Legacy)</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/streamplan" element={<StreamPlan />} />
          <Route path="/streamelements" element={<StreamElements />} />
          <Route path="/clipdesmonats" element={<ClipDesMonats />} />
          <Route path="/clipdesjahres" element={<ClipDesJahres />} />
          <Route path="/bartclicker" element={<BartClicker />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/offline" element={<OfflinePage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
      <CookieBanner />
    </div>
  )
}
