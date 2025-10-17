import { Link, Outlet } from 'react-router-dom'

function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 border-b bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-4 p-4">
          <Link to="/" className="font-bold">kkam-bbak</Link>
          <Link to="/app" className="text-sm text-gray-600 hover:text-gray-900">App</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout