import { useUser } from '../stores/user'
import { useMe } from '../hooks/useMe'

export default function Home() {
  const { user, login, logout } = useUser()
  const { data, isLoading, error, refetch } = useMe()

  return (
    <section className="space-y-3">
      <h1 className="text-3xl font-bold">Home</h1>

      {/* 로그인 상태 제어 */}
      <div className="space-x-2">
        <button className="rounded border px-3 py-1" onClick={() => login({ id: '1', name: 'guest' })}>
          login(mock)
        </button>
        <button className="rounded border px-3 py-1" onClick={logout}>
          logout
        </button>
        <span className="text-sm">user: {JSON.stringify(user)}</span>
      </div>

      {/* 서버 데이터 표시 */}
      <div className="text-sm">
        {isLoading && 'loading...'}
        {error && 'error'}
        {!isLoading && !error && data && <p>Data: {JSON.stringify(data)}</p>}
      </div>

      <button className="rounded border px-3 py-1" onClick={() => refetch()}>Refetch</button>
    </section>
  )
}