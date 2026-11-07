import { Fragment, useEffect, useState } from 'react'
import { Search, Trash2, User, AlertCircle, Check, X, Mail, Calendar, Zap, Wifi, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { fetchAllUsers, fetchUserDetails, deleteUser, activateSubscription } from './api'
import SubscriptionModal from './SubscriptionModal'

type WatchProgressEntry = {
  id: string
  contentId: string
  episodeId: string
  position: number
  duration: number
  completed: boolean
  updatedAt: string
  content: { id: string; title: string; type: string }
}

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
  const [activating, setActivating] = useState<string | null>(null)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [watchHistory, setWatchHistory] = useState<Record<string, WatchProgressEntry[]>>({})
  const [historyLoading, setHistoryLoading] = useState<string | null>(null)

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

  const handleQuickActivate = async (user: AdminUser) => {
    setActivating(user.id)
    try {
      await activateSubscription(user.id, 30)
      showToast(`Subscription activated for ${user.name}`)
    } catch (e: unknown) {
      showToast((e as Error).message, false)
    } finally {
      setActivating(null)
    }
  }

  const toggleWatchHistory = async (user: AdminUser) => {
    if (expandedUserId === user.id) {
      setExpandedUserId(null)
      return
    }

    setExpandedUserId(user.id)

    setHistoryLoading(user.id)
    try {
      const details = await fetchUserDetails(user.id)
      setWatchHistory(current => ({ ...current, [user.id]: details.progress }))
    } catch (e: unknown) {
      showToast((e as Error).message, false)
      setExpandedUserId(null)
    } finally {
      setHistoryLoading(null)
    }
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  const fmtPosition = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

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
                <Fragment key={u.id}>
                <tr>
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
                  <td>
                    <button className="watch-history-toggle" onClick={() => toggleWatchHistory(u)} aria-expanded={expandedUserId === u.id}>
                      {u._count.progress} {u._count.progress === 1 ? 'entry' : 'entries'}
                      {expandedUserId === u.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="act activate"
                        onClick={() => handleQuickActivate(u)}
                        disabled={activating === u.id}
                        title="Activate subscription (30 days)"
                      >
                        {activating === u.id ? <span className="spinner sm" /> : <Wifi size={14} />}
                      </button>
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
                {expandedUserId === u.id && (
                  <tr className="watch-history-row">
                    <td colSpan={6}>
                      {historyLoading === u.id ? (
                        <div className="watch-history-empty"><span className="spinner sm" /> Loading watch history…</div>
                      ) : watchHistory[u.id]?.length ? (
                        <div className="watch-history-list">
                          {watchHistory[u.id].map(entry => {
                            const percent = entry.duration > 0 ? Math.min(100, Math.round(entry.position / entry.duration * 100)) : 0
                            return (
                              <div className="watch-history-item" key={entry.id}>
                                <div className="watch-history-title">
                                  <strong>{entry.content.title}</strong>
                                  <span>{entry.content.type === 'SERIES' ? 'Series' : 'Movie'}</span>
                                </div>
                                <div className="watch-history-progress">
                                  <span>{entry.completed ? 'Completed' : `${percent}% watched`}</span>
                                  {entry.duration > 0 && <span>{fmtPosition(entry.position)} / {fmtPosition(entry.duration)}</span>}
                                </div>
                                <span className="watch-history-date"><Clock size={12} /> {new Date(entry.updatedAt).toLocaleString()}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="watch-history-empty">No watch history recorded.</div>
                      )}
                    </td>
                  </tr>
                )}
                </Fragment>
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
