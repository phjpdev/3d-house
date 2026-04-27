import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HouseExperience } from './components/HouseExperience'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/house/demo" replace />} />
        <Route path="/house/:slug" element={<HouseExperience />} />
      </Routes>
    </BrowserRouter>
  )
}
