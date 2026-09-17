import { useEffect, useState } from 'react'
import {
  Film, Tv, Plus, Pencil, Trash2, Eye, EyeOff,
  LogOut, LayoutDashboard, Check, AlertCircle,
  X, Search,
} from 'lucide-react'
import { fetchAllContent, updateContent, deleteContent, adminLogout, getAdminUser } from './api'
import ContentForm from './ContentForm'

export type AdminContent = {
  id: string; type: string; title: string; slug: string
  description: string; longDescription?: string
  posterUrl?: string; backdropUrl?: string; trailerUrl?: string
  year?: number; duration?: string; genre?: string; rating?: string
  imdb?: string; director?: string; cast: string[]; tags: string[]
  badge?: string; seasons?: number; isPublished: boolean
  tmdbId?: string
  createdAt: string
  videos: { id: string; provider: string; embedUrl?: string; playbackUrl?: string; isPrimary: boolean }[]
  seasonsData?: { seasonNumber: number; title?: string; episodes: { episodeNumber: number; title: string; description: string; duration?: string; isPublished: boolean; videos: { provider: string; embedUrl?: string; playbackUrl?: string; isPrimary: boolean }[] }[] }[]
}

type Toast = { msg: string; ok: boolean }
type View   = 'list' | 'new' | 'edit'
type Filter = 'ALL' | 'MOVIE' | 'SERIES' | 'DRAFT'

export default function Dashboard() {
  const user = getAdminUser()
  const [content,    setContent]    = useState<AdminContent[]>([])
  const [loading,    setLoading]    = useState(true)
  const [view,       setView]       = useState<View>('list')
  const [editTarget, setEditTarget] = useState<AdminContent | null>(null)
  const [toast,      setToast]      = useState<Toast | null>(null)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [filter,     setFilter]     = useState<Filter>('ALL')
  const [search,     setSearch]     = useState('')

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = async () => {
    setLoading(true)
    try { setContent(await fetchAllContent()) }
    catch (e: unknown) { showToast((e as Error).message, false) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (payload: Record<string, unknown>, id?: string) => {
    try {
      if (id) {
        await updateContent(id, payload)
        showToast('Changes saved')
      } else {
        const { createContent } = await import('./api')
        await createContent(payload)
        showToast('Content created')
      }
      await load()
      setView('list')
    } catch (e: unknown) { showToast((e as Error).message, false) }
  }

  const handleDelete = async (item: AdminContent) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return
    setDeleting(item.id)
    try {
      await deleteContent(item.id)
      setContent(p => p.filter(c => c.id !== item.id))
      showToast('Deleted')
    } catch (e: unknown) { showToast((e as Error).message, false) }
    finally { setDeleting(null) }
  }

  const handleToggle = async (item: AdminContent) => {
    try {
      await updateContent(item.id, { isPublished: !item.isPublished })
      setContent(p => p.map(c => c.id === item.id ? { ...c, isPublished: !c.isPublished } : c))
      showToast(item.isPublished ? 'Set to draft' : 'Published')
    } catch (e: unknown) { showToast((e as Error).message, false) }
  }

  const filtered = content.filter(c => {
    const matchType   = filter === 'ALL' || (filter === 'DRAFT' ? !c.isPublished : c.type === filter)
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
                        (c.genre || '').toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const stats = {
    total:     content.length,
    movies:    content.filter(c => c.type === 'MOVIE').length,
    series:    content.filter(c => c.type === 'SERIES').length,
    published: content.filter(c => c.isPublished).length,
    drafts:    content.filter(c => !c.isPublished).length,
  }

  return (
    <div className="shell">
      {toast && (
        <div className={`toast ${toast.ok ? 'ok' : 'err'}`}>
          {toast.ok ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="logo-mark">C</span>
          <span className="logo-wordmark">CINE<em>FLIX</em></span>
        </div>
        <p className="sidebar-sub">Admin Portal</p>

        <nav className="sidebar-nav">
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button onClick={() => { setEditTarget(null); setView('new') }}>
            <Plus size={16} /> Add Content
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || 'A'}</div>
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-email">{user?.email}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={() => { adminLogout(); window.location.reload() }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main">
        {view === 'list' && (
          <>
            <div className="page-header">
              <div>
                <h1>Content Library</h1>
                <p className="page-sub">{stats.total} titles · {stats.published} published · {stats.drafts} drafts</p>
              </div>
              <button className="btn-primary" onClick={() => { setEditTarget(null); setView('new') }}>
                <Plus size={15} /> Add Content
              </button>
            </div>

            {/* stats */}
            <div className="stats-row">
              {[
                { label: 'Total',     val: stats.total,     color: 'var(--red)' },
                { label: 'Movies',    val: stats.movies,    color: '#3b82f6' },
                { label: 'Series',    val: stats.series,    color: '#8b5cf6' },
                { label: 'Published', val: stats.published, color: '#22c55e' },
                { label: 'Drafts',    val: stats.drafts,    color: '#f59e0b' },
              ].map(s => (
                <div className="stat-card" key={s.label} style={{ borderTopColor: s.color }}>
                  <span className="stat-num" style={{ color: s.color }}>{s.val}</span>
                  <span className="stat-lbl">{s.label}</span>
                </div>
              ))}
            </div>

            {/* toolbar */}
            <div className="toolbar">
              <div className="filter-tabs">
                {(['ALL', 'MOVIE', 'SERIES', 'DRAFT'] as Filter[]).map(f => (
                  <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                    {f === 'ALL' ? 'All' : f === 'MOVIE' ? 'Movies' : f === 'SERIES' ? 'Series' : 'Drafts'}
                    <span>{f === 'ALL' ? stats.total : f === 'MOVIE' ? stats.movies : f === 'SERIES' ? stats.series : stats.drafts}</span>
                  </button>
                ))}
              </div>
              <div className="search-box">
                <Search size={14} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search titles…" />
                {search && <button onClick={() => setSearch('')}><X size={13} /></button>}
              </div>
            </div>

            {/* table */}
            {loading ? (
              <div className="center-state"><span className="spinner lg" /><p>Loading…</p></div>
            ) : filtered.length === 0 ? (
              <div className="center-state">
                <Film size={40} />
                <p>{search ? `No results for "${search}"` : 'No content yet.'}</p>
                {!search && <button className="btn-primary" onClick={() => setView('new')}><Plus size={15} /> Add first title</button>}
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Poster</th><th>Title</th><th>Type</th>
                      <th>Genre</th><th>Year</th><th>Seasons / Episodes</th><th>Source</th>
                      <th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div className="thumb">
                            {item.posterUrl
                              ? <img src={item.posterUrl} alt="" />
                              : <div className="thumb-ph">{item.type === 'SERIES' ? <Tv size={14}/> : <Film size={14}/>}</div>
                            }
                          </div>
                        </td>
                        <td>
                          <div className="title-cell">
                            <strong>{item.title}</strong>
                            {item.badge && <span className="badge-pill">{item.badge}</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`type-chip ${item.type === 'MOVIE' ? 'movie' : 'series'}`}>
                            {item.type === 'MOVIE' ? <Film size={10}/> : <Tv size={10}/>}
                            {item.type}
                          </span>
                        </td>
                        <td><div className="genre-list">{(item.genre || '—').split(',').map(genre => <span key={genre}>{genre.trim()}</span>)}</div></td>
                        <td className="cell-muted">{item.year || '—'}</td>
                        <td className="cell-muted">{item.type === 'SERIES' ? `${item.seasonsData?.length || 0} season${item.seasonsData?.length === 1 ? '' : 's'} · ${item.seasonsData?.reduce((total, season) => total + season.episodes.length, 0) || 0} episodes` : '—'}</td>
                        <td><span className="source-chip">{item.type === 'SERIES' ? 'Episode links' : item.videos[0]?.provider || 'No source'}</span></td>
                        <td>
                          <button className={`status-btn ${item.isPublished ? 'pub' : 'draft'}`} onClick={() => handleToggle(item)}>
                            {item.isPublished ? <><Eye size={11}/> Published</> : <><EyeOff size={11}/> Draft</>}
                          </button>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="act edit" onClick={() => { setEditTarget(item); setView('edit') }} title="Edit">
                              <Pencil size={14}/>
                            </button>
                            <button className="act delete" onClick={() => handleDelete(item)} disabled={deleting === item.id} title="Delete">
                              {deleting === item.id ? <span className="spinner sm"/> : <Trash2 size={14}/>}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {(view === 'new' || view === 'edit') && (
          <ContentForm initial={editTarget} onSave={handleSave} onCancel={() => setView('list')} />
        )}
      </main>
    </div>
  )
}
