import { Routes, Route } from 'react-router-dom'
import ChatPage from './pages/Chatpage'

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<ChatPage />} />
    </Routes>
  )
}
