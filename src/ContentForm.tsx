import { useState } from 'react'
import { Check, X, Upload, ChevronLeft, Download } from 'lucide-react'
import type { AdminContent } from './Dashboard'
import { importFromTmdb } from './api'

const PROVIDERS = ['YOUTUBE', 'VIMEO', 'DIRECT_MP4', 'DIRECT_HLS', 'EXTERNAL_EMBED']
const GENRES    = ['Action','Adventure','Comedy','Crime','Documentary','Drama','Horror','Music','Romance','Sci-Fi','Thriller']
const RATINGS   = ['G','PG','PG-13','13+','16+','18+','NR']
const BADGES    = ['','NEW','TOP 10','TRENDING','CINEFLIX ORIGINAL','FEATURED']

const BLANK = {
  type:'MOVIE', title:'', description:'', longDescription:'',
  posterUrl:'', backdropUrl:'', trailerUrl:'',
  year: new Date().getFullYear(), duration:'', genre:'Drama, Thriller, Action',
  rating:'13+', imdb:'', director:'', cast:'', tags:'',
  badge:'', seasons:'', isPublished: false,
  videoProvider:'EXTERNAL_EMBED', embedUrl:'', playbackUrl:'',
  tmdbId: '',
  seasonsData: [] as SeasonForm[],
}

type EpisodeForm = { episodeNumber: number; title: string; description: string; duration: string; isPublished: boolean; videoProvider: string; embedUrl: string; playbackUrl: string }
type SeasonForm = { seasonNumber: number; title: string; episodes: EpisodeForm[] }
const newEpisode = (number = 1): EpisodeForm => ({ episodeNumber: number, title: '', description: '', duration: '', isPublished: true, videoProvider: 'YOUTUBE', embedUrl: '', playbackUrl: '' })
const newSeason = (number = 1): SeasonForm => ({ seasonNumber: number, title: `Season ${number}`, episodes: [newEpisode()] })

type Props = {
  initial: AdminContent | null
  onSave: (payload: Record<string, unknown>, id?: string) => Promise<void>
  onCancel: () => void
}

export default function ContentForm({ initial, onSave, onCancel }: Props) {
  const primary = initial?.videos.find(v => v.isPrimary) || initial?.videos[0]

  const [form, setForm] = useState(initial ? {
    type:            initial.type,
    tmdbId:         initial.tmdbId || '',
    title:           initial.title,
    description:     initial.description,
    longDescription: initial.longDescription || '',
    posterUrl:       initial.posterUrl       || '',
    backdropUrl:     initial.backdropUrl     || '',
    trailerUrl:      initial.trailerUrl      || '',
    year:            initial.year            ?? new Date().getFullYear(),
    duration:        initial.duration        || '',
    genre:           initial.genre           || 'Drama, Thriller, Action',
    rating:          initial.rating          || '13+',
    imdb:            initial.imdb            || '',
    director:        initial.director        || '',
    cast:            initial.cast.join(', '),
    tags:            initial.tags.join(', '),
    badge:           initial.badge           || '',
    seasons:         initial.seasons?.toString() || '',
    isPublished:     initial.isPublished,
    videoProvider:   primary?.provider       || 'YOUTUBE',
    embedUrl:        primary?.embedUrl       || '',
    playbackUrl:     primary?.playbackUrl    || '',
    seasonsData:     (initial.seasonsData || []).map(s => ({
      seasonNumber: s.seasonNumber,
      title: s.title || `Season ${s.seasonNumber}`,
      episodes: (s.episodes || []).map(e => {
        const vid = e.videos?.find(v => v.isPrimary) || e.videos?.[0]
        return {
          episodeNumber: e.episodeNumber,
          title:         e.title || '',
          description:   e.description || '',
          duration:      e.duration || '',
          isPublished:   e.isPublished ?? true,
          videoProvider: vid?.provider || 'YOUTUBE',
          embedUrl:      vid?.embedUrl || '',
          playbackUrl:   vid?.playbackUrl || '',
        }
      }),
    })),
  } : { ...BLANK })

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [tmdbLoading, setTmdbLoading] = useState(false)

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setForm(p => ({ ...p, [key]: val }))
    setErrors(p => { const n = {...p}; delete n[key]; return n })
  }

  const validate = () => {
    const e: Record<string,string> = {}
    if (!form.title.trim())       e.title       = 'Title is required'
    if (!form.description.trim()) e.description = 'Short description is required'
    if (form.genre.split(',').map(g => g.trim()).filter(Boolean).length < 3) e.genre = 'Choose at least 3 genres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const importTmdb = async () => {
    if (!form.tmdbId.trim()) return setErrors(prev => ({ ...prev, tmdbId: 'Enter a TMDB ID' }))
    setTmdbLoading(true)
    try {
      const data = await importFromTmdb(form.type, form.tmdbId.trim())
      setForm(prev => ({
        ...prev,
        ...data,
        tmdbId: data.tmdbId,
        cast: Array.isArray(data.cast) ? data.cast.join(', ') : (data.cast || prev.cast),
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || prev.tags),
        isPublished: false,
        genre: data.genre || prev.genre,
        seasonsData: data.seasonsData || prev.seasonsData,
      }))
      setErrors(prev => { const next = { ...prev }; delete next.tmdbId; return next })
    } catch (error) {
      setErrors(prev => ({ ...prev, tmdbId: (error as Error).message }))
    } finally { setTmdbLoading(false) }
  }

  const submit = async (publish?: boolean) => {
    if (!validate()) return
    setSaving(true)
    const hasVideo = form.type !== 'SERIES' && (form.embedUrl.trim() || form.playbackUrl.trim())
    const listValue = (value: string | string[]) => Array.isArray(value) ? value : value.split(',')
    const payload: Record<string, unknown> = {
      type:            form.type,
      tmdbId:          form.tmdbId.trim() || null,
      title:           form.title.trim(),
      description:     form.description.trim(),
      longDescription: form.longDescription.trim() || null,
      posterUrl:       form.posterUrl.trim()       || null,
      backdropUrl:     form.backdropUrl.trim()     || null,
      trailerUrl:      form.trailerUrl.trim()      || null,
      year:            form.year                   || null,
      duration:        form.duration.trim()        || null,
      genre:           form.genre.split(',').map(g => g.trim()).filter(Boolean).join(', ') || null,
      rating:          form.rating                 || null,
      imdb:            form.imdb.trim()            || null,
      director:        form.director.trim()        || null,
      cast:            listValue(form.cast).map(s => s.trim()).filter(Boolean),
      tags:            listValue(form.tags).map(s => s.trim()).filter(Boolean),
      badge:           form.badge                  || null,
      seasons:         form.type === 'SERIES' && form.seasons ? parseInt(form.seasons) : null,
      isPublished:     publish !== undefined ? publish : form.isPublished,
      ...(hasVideo && { video: {
        provider:    form.videoProvider,
        embedUrl:    form.embedUrl.trim()    || null,
        playbackUrl: form.playbackUrl.trim() || null,
        isPrimary:   true,
      }}),
      ...(form.type === 'SERIES' && { seasonsData: (form.seasonsData || []).map(s => ({ seasonNumber: s.seasonNumber, title: s.title, episodes: (s.episodes || []).map(e => ({ episodeNumber: e.episodeNumber, title: e.title || '', description: e.description || '', duration: e.duration || null, isPublished: e.isPublished, video: ((e.embedUrl || '').trim() || (e.playbackUrl || '').trim()) ? { provider: e.videoProvider || 'YOUTUBE', embedUrl: (e.embedUrl || '').trim() || null, playbackUrl: (e.playbackUrl || '').trim() || null } : null })) })) }),
    }
    await onSave(payload, initial?.id)
    setSaving(false)
  }

  return (
    <div className="form-page">
      <div className="form-topbar">
        <button className="btn-back" onClick={onCancel}><ChevronLeft size={17}/> Back</button>
        <h1>{initial ? `Edit — ${initial.title}` : 'Add New Content'}</h1>
        <div className="form-topbar-actions">
          <button className="btn-ghost" onClick={onCancel} disabled={saving}><X size={14}/> Cancel</button>
          <button className="btn-outline" onClick={() => submit(false)} disabled={saving}>Save as Draft</button>
          <button className="btn-primary" onClick={() => submit(true)} disabled={saving}>
            {saving ? <span className="spinner sm"/> : <Check size={14}/>}
            {saving ? 'Saving…' : initial ? 'Save & Publish' : 'Create & Publish'}
          </button>
        </div>
      </div>

      <div className="form-grid">
        {/* LEFT */}
        <div className="form-col">
          <div className="card">
            <h3>Basic Info</h3>
            <div className="tmdb-import-box">
              <div><label>TMDB ID <span className="hint">metadata importer</span></label><p>Fetch title, artwork, genres, cast, and series episodes.</p></div>
              <div className="tmdb-import-row"><input value={form.tmdbId} onChange={f('tmdbId')} placeholder="e.g. 194583" className={errors.tmdbId ? 'err' : ''} /><button type="button" className="btn-outline" onClick={importTmdb} disabled={tmdbLoading}>{tmdbLoading ? <span className="spinner sm" /> : <Download size={14} />} {tmdbLoading ? 'Importing…' : 'Import details'}</button></div>
              {errors.tmdbId && <span className="field-err">{errors.tmdbId}</span>}
            </div>
            <div className="field-row">
              <div className="field">
                <label>Type</label>
                <select value={form.type} onChange={f('type')}>
                  <option value="MOVIE">Movie</option>
                  <option value="SERIES">TV Series</option>
                </select>
              </div>
              {form.type === 'SERIES' && (
                <div className="field narrow">
                  <label>Seasons</label>
                  <input type="number" value={form.seasons} onChange={f('seasons')} min={1} placeholder="1"/>
                </div>
              )}
            </div>

            <div className="field">
              <label>Title <span className="req">*</span></label>
              <input value={form.title} onChange={f('title')} placeholder="Title" className={errors.title ? 'err':''}/>
              {errors.title && <span className="field-err">{errors.title}</span>}
            </div>

            <div className="field">
              <label>Short Description <span className="req">*</span> <span className="hint">shown on cards</span></label>
              <textarea value={form.description} onChange={f('description')} rows={3}
                placeholder="One or two sentences" className={errors.description ? 'err':''}/>
              {errors.description && <span className="field-err">{errors.description}</span>}
            </div>

            <div className="field">
              <label>Full Description <span className="hint">detail page</span></label>
              <textarea value={form.longDescription} onChange={f('longDescription')} rows={5}
                placeholder="Full synopsis for the detail page"/>
            </div>

            <div className="field-row three">
              <div className="field genre-field">
                <label>Genres <span className="req">*</span> <span className="hint">choose at least 3</span></label>
                <div className="genre-options">{GENRES.map(g => { const selected = form.genre.split(',').map(v => v.trim()).includes(g); return <button type="button" key={g} className={selected ? 'selected' : ''} onClick={() => { const values = form.genre.split(',').map(v => v.trim()).filter(Boolean); setForm(p => ({ ...p, genre: (selected ? values.filter(v => v !== g) : [...values, g]).join(', ') })) }}>{selected && <Check size={12}/>} {g}</button> })}</div>
                {errors.genre && <span className="field-err">{errors.genre}</span>}
              </div>
              <div className="field">
                <label>Rating</label>
                <select value={form.rating} onChange={f('rating')}>
                  {RATINGS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Badge</label>
                <select value={form.badge} onChange={f('badge')}>
                  {BADGES.map(b => <option key={b} value={b}>{b || '(none)'}</option>)}
                </select>
              </div>
            </div>

            {form.type === 'SERIES' && (
              <div className="card">
                <div className="series-editor-head">
                  <div><h3>Seasons & Episodes</h3><span className="hint">Add your seasons and episodes with video links.</span></div>
                  <button className="btn-outline" type="button" onClick={() => setForm(p => ({ ...p, seasonsData: [...(p.seasonsData || []), newSeason((p.seasonsData || []).length + 1)] }))}>+ Add Season</button>
                </div>

                {(form.seasonsData || []).length === 0 && (
                  <p className="empty-seasons-hint">No seasons yet. Click "Add Season" to get started.</p>
                )}

                {(form.seasonsData || []).map((s, si) => (
                  <div className="season-block" key={si}>
                    <div className="season-block-header">
                      <div className="season-block-title">
                        <span className="season-badge">S{s.seasonNumber}</span>
                        <input
                          className="season-title-input"
                          value={s.title}
                          onChange={e => setForm(p => ({ ...p, seasonsData: p.seasonsData.map((x, i) => i === si ? { ...x, title: e.target.value } : x) }))}
                          placeholder={`Season ${s.seasonNumber} title`}
                        />
                      </div>
                      <div className="season-block-actions">
                        <button className="btn-ghost small" type="button"
                          onClick={() => setForm(p => ({ ...p, seasonsData: p.seasonsData.map((x, i) => i === si ? { ...x, episodes: [...x.episodes, newEpisode(x.episodes.length + 1)] } : x) }))}>
                          + Episode
                        </button>
                        <button className="btn-danger-ghost small" type="button"
                          onClick={() => setForm(p => ({ ...p, seasonsData: p.seasonsData.filter((_, i) => i !== si) }))}>
                          Remove Season
                        </button>
                      </div>
                    </div>

                    <div className="episodes-list">
                      {s.episodes.map((ep, ei) => (
                        <div className="episode-form-card" key={ei}>
                          <div className="episode-form-header">
                            <span className="ep-badge">E{ep.episodeNumber}</span>
                            <input
                              className="ep-title-input"
                              value={ep.title}
                              onChange={e => setForm(p => ({ ...p, seasonsData: p.seasonsData.map((x, i) => i === si ? { ...x, episodes: x.episodes.map((y, j) => j === ei ? { ...y, title: e.target.value } : y) } : x) }))}
                              placeholder="Episode title"
                            />
                            <input
                              type="number" min={1} className="ep-num-input"
                              value={ep.episodeNumber}
                              onChange={e => setForm(p => ({ ...p, seasonsData: p.seasonsData.map((x, i) => i === si ? { ...x, episodes: x.episodes.map((y, j) => j === ei ? { ...y, episodeNumber: Number(e.target.value) } : y) } : x) }))}
                            />
                            <button className="ep-remove" type="button"
                              onClick={() => setForm(p => ({ ...p, seasonsData: p.seasonsData.map((x, i) => i === si ? { ...x, episodes: x.episodes.filter((_, j) => j !== ei) } : x) }))}>
                              <X size={13} />
                            </button>
                          </div>

                          <textarea
                            value={ep.description}
                            onChange={e => setForm(p => ({ ...p, seasonsData: p.seasonsData.map((x, i) => i === si ? { ...x, episodes: x.episodes.map((y, j) => j === ei ? { ...y, description: e.target.value } : y) } : x) }))}
                            placeholder="Episode description"
                            rows={2}
                            className="ep-desc"
                          />

                          <div className="ep-video-row">
                            <select
                              value={ep.videoProvider}
                              onChange={e => setForm(p => ({ ...p, seasonsData: p.seasonsData.map((x, i) => i === si ? { ...x, episodes: x.episodes.map((y, j) => j === ei ? { ...y, videoProvider: e.target.value } : y) } : x) }))}
                              className="ep-provider-select"
                            >
                              {PROVIDERS.map(pr => <option key={pr}>{pr}</option>)}
                            </select>
                            <input
                              value={ep.embedUrl || ep.playbackUrl}
                              onChange={e => {
                                const val = e.target.value
                                setForm(p => ({ ...p, seasonsData: p.seasonsData.map((x, i) => i === si ? { ...x, episodes: x.episodes.map((y, j) => j === ei ? {
                                  ...y,
                                  embedUrl:    ['YOUTUBE','VIMEO','EXTERNAL_EMBED'].includes(y.videoProvider) ? val : '',
                                  playbackUrl: ['DIRECT_MP4','DIRECT_HLS'].includes(y.videoProvider) ? val : '',
                                } : y) } : x) }))
                              }}
                              placeholder={['DIRECT_MP4','DIRECT_HLS'].includes(ep.videoProvider) ? 'https://…/video.mp4 or .m3u8' : 'https://cinesrc.st/embed/movie/ or /tv/ + ID'}
                              className="ep-url-input"
                            />
                            <input
                              value={ep.duration}
                              onChange={e => setForm(p => ({ ...p, seasonsData: p.seasonsData.map((x, i) => i === si ? { ...x, episodes: x.episodes.map((y, j) => j === ei ? { ...y, duration: e.target.value } : y) } : x) }))}
                              placeholder="45m"
                              className="ep-duration-input"
                            />
                          </div>
                        </div>
                      ))}
                      {s.episodes.length === 0 && (
                        <p className="empty-seasons-hint">No episodes yet.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="field-row three">
              <div className="field">
                <label>Year</label>
                <input type="number" value={form.year} onChange={f('year')} min={1900} max={2100}/>
              </div>
              <div className="field">
                <label>Duration</label>
                <input value={form.duration} onChange={f('duration')} placeholder="1h 42m"/>
              </div>
              <div className="field">
                <label>IMDb</label>
                <input value={form.imdb} onChange={f('imdb')} placeholder="8.2"/>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Cast & Crew</h3>
            <div className="field">
              <label>Director</label>
              <input value={form.director} onChange={f('director')} placeholder="Director name"/>
            </div>
            <div className="field">
              <label>Cast <span className="hint">comma-separated</span></label>
              <input value={form.cast} onChange={f('cast')} placeholder="Actor One, Actor Two"/>
            </div>
            <div className="field">
              <label>Tags / Mood <span className="hint">comma-separated</span></label>
              <input value={form.tags} onChange={f('tags')} placeholder="Emotional, Slow burn"/>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="form-col">
          <div className="card">
            <h3>Images</h3>
            <div className="field">
              <label>Poster URL <span className="hint">portrait 2:3</span></label>
              <input value={form.posterUrl} onChange={f('posterUrl')} placeholder="https://…"/>
              {form.posterUrl && (
                <div className="img-preview portrait">
                  <img src={form.posterUrl} alt="Poster"
                    onError={e => {(e.target as HTMLImageElement).parentElement!.style.display='none'}}/>
                </div>
              )}
            </div>
            <div className="field">
              <label>Backdrop URL <span className="hint">wide 16:9</span></label>
              <input value={form.backdropUrl} onChange={f('backdropUrl')} placeholder="https://…"/>
              {form.backdropUrl && (
                <div className="img-preview landscape">
                  <img src={form.backdropUrl} alt="Backdrop"
                    onError={e => {(e.target as HTMLImageElement).parentElement!.style.display='none'}}/>
                </div>
              )}
            </div>
            <div className="field">
              <label>Trailer URL <span className="hint">YouTube embed</span></label>
              <input value={form.trailerUrl} onChange={f('trailerUrl')}
                placeholder="https://www.youtube.com/embed/VIDEO_ID"/>
            </div>
          </div>

          {form.type !== 'SERIES' && <div className="card">
            <h3>Video Source</h3>
            <p className="card-hint">Paste a URL for now — file upload will be enabled once you connect a storage provider.</p>
            <div className="field">
              <label>Provider</label>
              <select value={form.videoProvider} onChange={f('videoProvider')}>
                {PROVIDERS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            {['YOUTUBE','VIMEO','EXTERNAL_EMBED'].includes(form.videoProvider) && (
              <div className="field">
                <label>Embed URL</label>
                {form.videoProvider === 'EXTERNAL_EMBED' ? (
                  <div className="embed-prefix-wrap">
                    <span className="embed-prefix">https://cinesrc.st/embed/{form.type === 'SERIES' ? 'tv' : 'movie'}/</span>
                    <input
                      className="embed-id-input"
                      value={form.embedUrl.replace(/^https:\/\/cinesrc\.st\/embed\/(movie|tv)\//, '')}
                      onChange={e => setForm(p => ({ ...p, embedUrl: `https://cinesrc.st/embed/${p.type === 'SERIES' ? 'tv' : 'movie'}/${e.target.value}` }))}
                      placeholder="1339713"
                    />
                  </div>
                ) : (
                  <input value={form.embedUrl} onChange={f('embedUrl')}
                    placeholder="https://www.youtube.com/embed/VIDEO_ID"/>
                )}
              </div>
            )}
            {['DIRECT_MP4','DIRECT_HLS'].includes(form.videoProvider) && (
              <div className="field">
                <label>Playback URL</label>
                <input value={form.playbackUrl} onChange={f('playbackUrl')}
                  placeholder="https://…/video.mp4  or  …/index.m3u8"/>
              </div>
            )}
            <div className="upload-placeholder">
              <Upload size={22}/>
              <strong>File upload — coming soon</strong>
              <span>Connect Cloudflare Stream, Backblaze B2, or another provider to enable direct uploads.</span>
            </div>
          </div>}

          <div className="card">
            <h3>Publishing</h3>
            <label className="toggle-row">
              <input type="checkbox" checked={form.isPublished} onChange={f('isPublished')}/>
              <div>
                <strong>{form.isPublished ? 'Published' : 'Draft'}</strong>
                <p>{form.isPublished ? 'Visible to all users on the site' : 'Hidden — only visible in this dashboard'}</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="form-footer">
        <button className="btn-ghost" onClick={onCancel} disabled={saving}><X size={14}/> Cancel</button>
        <button className="btn-outline" onClick={() => submit(false)} disabled={saving}>Save as Draft</button>
        <button className="btn-primary" onClick={() => submit(true)} disabled={saving}>
          {saving ? <span className="spinner sm"/> : <Check size={14}/>}
          {saving ? 'Saving…' : initial ? 'Save & Publish' : 'Create & Publish'}
        </button>
      </div>
    </div>
  )
}
