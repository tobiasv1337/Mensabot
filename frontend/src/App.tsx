import { Routes, Route } from 'react-router-dom'
import AppShell from './layouts/AppShell'

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<AppShell />} />
    </Routes>
  )
}
