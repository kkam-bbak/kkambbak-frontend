import { Navigate, Outlet } from 'react-router-dom'
import { useUser } from '../stores/user'

export default function Protected() {
  const user = useUser((s) => s.user)
  return user ? <Outlet /> : <Navigate to="/" replace />
}