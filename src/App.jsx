import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Overview from './pages/Overview'
import ReviewQueue from './pages/ReviewQueue'
import AuditDetail from './pages/AuditDetail'
import Findings from './pages/Findings'
import CorrectiveActions from './pages/CorrectiveActions'
import AuditLog from './pages/AuditLog'
import Patients from './pages/Patients'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/review-queue" element={<ReviewQueue />} />
        <Route path="/audits/:id" element={<AuditDetail />} />
        <Route path="/findings" element={<Findings />} />
        <Route path="/corrective-actions" element={<CorrectiveActions />} />
        <Route path="/audit-log" element={<AuditLog />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
    </Routes>
  )
}
