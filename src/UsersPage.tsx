import { useEffect, useState } from 'react'
import { Search, Trash2, User, AlertCircle, Check, X, Mail, Calendar, Zap } from 'lucide-react'
import { fetchAllUsers, deleteUser } from './api'
import SubscriptionModal from './SubscriptionModal'

type AdminUser = {
  id: string
  name: string
  email: string
  createdAt: string
  _count: { watchlist: number; progress: number }
}

type Toast = { msg: string; ok: boolean }

export default function UsersPage() {
  const [users,    setUsers]    = useState<AdminUser[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toast,    setToast]    = useState<Toast | null>(null)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = async (q = search) => {
    setLoading(true)
    try {
      const data = await fetchAllUsers(q)
      setUsers(data.users)
      setTotal(data.total)
    } catch (e: unknown) { showToast((e as Error).message, false) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load(search)
  }

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete account for "${user.name}" (${user.email})?\n\nThis will also delete their watchlist and watch history. This cannot be undone.`)) return
    setDeleting(user.id)
    try {
      await deleteUser(user.id)
      setUsers(p => p.filter(u => u.id !== user.id))
      setTotal(p => p - 1)
      showToast('User deleted')
    } catch (e: unknown) { showToast((e as Error).message, false) }
    finally { setDeleting(null) }
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div>
      {toast && (
        <div className={`toast ${toast.ok ? 'ok' : 'err'}`}>
          {toast.ok ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>User Accounts</h1>
          <p className="page-sub">{total} registered user{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* search */}
      <form onSubmit={handleSearch} className="users-search-row">
        <div className="search-box">
          <Search size={14} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
          />
          {search && <button type="button" onClick={() => { setSearch(''); load('') }}><X size={13} /></button>}
        </div>
        <button type="submit" className="btn-primary">Search</button>
      </form>

      {/* table */}
      {loading ? (
        <div className="center-state"><span className="spinner lg" /><p>Loading users…</p></div>
      ) : users.length === 0 ? (
        <div className="center-state">
          <User size={40} />
          <p>{search ? `No users found for "${search}"` : 'No users have signed up yet.'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Watchlist</th>
                <th>Watch History</th>
                <th style={{ width: 60 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar-sm">{u.name[0]?.toUpperCase()}</div>
                      <strong>{u.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="cell-muted user-email-cell">
                      <Mail size={12} /> {u.email}
                    </span>
                  </td>
                  <td className="cell-muted">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar size={12} /> {fmt(u.createdAt)}
                    </span>
                  </td>
                  <td className="cell-muted">{u._count.watchlist} titles</td>
                  <td className="cell-muted">{u._count.progress} entries</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="act sub"
                        onClick={() => setSelectedUser(u)}
                        title="Manage subscription"
                      >
                        <Zap size={14} />
                      </button>
                      <button
                        className="act delete"
                        onClick={() => handleDelete(u)}
                        disabled={deleting === u.id}
                        title="Delete user"
                      >
                        {deleting === u.id ? <span className="spinner sm" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Subscription Modal */}
      {selectedUser && (
        <SubscriptionModal
          userId={selectedUser.id}
          userName={selectedUser.name}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => load(search)}
        />
      )}
    </div>
  )
}
