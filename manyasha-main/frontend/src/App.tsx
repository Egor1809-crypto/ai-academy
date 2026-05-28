import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PartnerDashboardPage } from './pages/PartnerDashboardPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PartnerDashboardPage />} />
        <Route path="/partner" element={<PartnerDashboardPage />} />
        <Route path="/partner/*" element={<PartnerDashboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
