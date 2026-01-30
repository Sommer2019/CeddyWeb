import React from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home.tsx'
import BartClicker from './pages/BartClicker.tsx'
import ClipDesMonats from './pages/ClipDesMonats.tsx'
import ClipDesJahres from './pages/ClipDesJahres.tsx'
import StreamPlan from './pages/StreamPlan.tsx'
import StreamElements from './pages/StreamElements.tsx'
import Impressum from './pages/Impressum.tsx'
import Datenschutz from './pages/Datenschutz.tsx'
import OfflinePage from './pages/Offline.tsx'
import NotFound from './pages/NotFound.tsx'
import OnlyBart from './pages/OnlyBart.tsx'
import OBPosts from './pages/OBPosts.tsx'
import OBMedia from './pages/OBMedia.tsx'
import OBPhotos from './pages/OBPhotos.tsx'
import OBVideos from './pages/OBVideos.tsx'
import Footer from './components/Footer.tsx'
import CookieBanner from './components/CookieBanner.tsx'

export default function App() {
  useLocation()

  return (
    <div>
          <header className="app-header">
            <div className="app-nav-container">
              <nav className="app-nav">
                <Link to="/">Home</Link>
                <Link to="/streamplan">Streamplan</Link>
                <Link to="/streamelements">StreamElements</Link>
                <Link to="/clipdesmonats">Clip des Monats</Link>
                <Link to="/clipdesjahres">Clip des Jahres</Link>
                <Link to="/bartclicker">Bartclicker</Link>
                <Link to="/ob">OnlyBart</Link>
              </nav>
            </div>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/streamplan" element={<StreamPlan />} />
              <Route path="/streamelements" element={<StreamElements />} />
              <Route path="/clipdesmonats" element={<ClipDesMonats />} />
              <Route path="/clipdesjahres" element={<ClipDesJahres />} />
              <Route path="/bartclicker" element={<BartClicker />} />
              <Route path="/ob" element={<OnlyBart />} />
              <Route path="/ob/posts" element={<OBPosts />} />
              <Route path="/ob/media" element={<OBMedia />} />
              <Route path="/ob/photos" element={<OBPhotos />} />
              <Route path="/ob/videos" element={<OBVideos />} />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="/datenschutz" element={<Datenschutz />} />
              <Route path="/offline" element={<OfflinePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
      <CookieBanner />
    </div>
  )
}
