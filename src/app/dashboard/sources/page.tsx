'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseYoutubeUrl, getYoutubeThumbnail as buildYoutubeThumbnail } from '@/lib/parsers/parseYoutubeUrl'
import { isGoogleDriveUrl } from '@/lib/parsers/parseDriveUrl'
import type { SourceType } from '@/types'

type SourceForm = { type: SourceType; value: string; title: string }

const SOURCE_TYPES: { type: SourceType; icon: string; label: string }[] = [
  { type: 'text',    icon: '📝', label: 'Texte'   },
  { type: 'youtube', icon: '🎬', label: 'YouTube' },
  { type: 'pdf',     icon: '📄', label: 'PDF'     },
  { type: 'drive',   icon: '📦', label: 'Drive'   },
  { type: 'image',   icon: '🖼️', label: 'Image'   },
]

function isYoutubeUrl(url: string) {
  try {
    const u = new URL(url)
    return u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')
  } catch { return false }
}

export default function SourcesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [sources, setSources]       = useState<SourceForm[]>([])
  const [courseTitle, setCourseTitle] = useState('')
  const [subject, setSubject]       = useState('')
  const [level, setLevel]           = useState('high_school')
  const [lang, setLang]             = useState('fr')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [inputType, setInputType]   = useState<SourceType>('text')
  const [inputValue, setInputValue] = useState('')
  const [inputTitle, setInputTitle] = useState('')

  function addSource() {
    if (!inputValue.trim()) return
    setSources(prev => [...prev, { type: inputType, value: inputValue, title: inputTitle || inputType }])
    setInputValue('')
    setInputTitle('')
  }

  function removeSource(i: number) {
    setSources(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (sources.length === 0) { setError('Ajoute au moins une source.'); return }
    if (!courseTitle.trim()) { setError('Donne un titre au cours.'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/sources/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources, courseTitle, subject, level, lang }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { courseId } = await res.json()
      router.push(`/dashboard/courses/${courseId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setLoading(false)
    }
  }

  function getYoutubeThumbnail(value: string) {
    if (!isYoutubeUrl(value)) return null
    const id = parseYoutubeUrl(value)
    return id ? buildYoutubeThumbnail(id) : null
  }

  const sourceMeta = SOURCE_TYPES.find(s => s.type === inputType)!
  const inputPlaceholder =
    inputType === 'youtube' ? 'https://youtube.com/watch?v=...' :
    inputType === 'drive'   ? 'https://drive.google.com/file/d/...' :
    inputType === 'pdf'     ? 'URL du PDF (depuis Supabase Storage)' :
    inputType === 'image'   ? "URL de l'image" : ''

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">

      <h1 className="font-serif text-3xl font-semibold text-ink-800 mb-1">
        Nouvelle source
      </h1>
      <p className="text-ink-400 text-sm mb-8">
        Ajoute une ou plusieurs sources, puis l&apos;IA créera ton cours.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Infos du cours ── */}
        <div className="card space-y-3">
          <h2 className="font-serif text-lg text-ink-800">Infos du cours</h2>
          <input
            placeholder="Titre du cours (ex : Thermodynamique)"
            value={courseTitle} onChange={e => setCourseTitle(e.target.value)} required
            className="input"
          />
          <input
            placeholder="Matière (ex : Physique)"
            value={subject} onChange={e => setSubject(e.target.value)} required
            className="input"
          />
          <div className="grid grid-cols-2 gap-3">
            <select value={level} onChange={e => setLevel(e.target.value)} className="input">
              <option value="primary">Primaire</option>
              <option value="middle">Collège</option>
              <option value="high_school">Lycée</option>
              <option value="university">Université</option>
            </select>
            <select value={lang} onChange={e => setLang(e.target.value)} className="input">
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>

        {/* ── Ajouter une source ── */}
        <div className="card space-y-4">
          <h2 className="font-serif text-lg text-ink-800">Ajouter une source</h2>

          {/* Sélecteur de type */}
          <div className="flex gap-2 flex-wrap">
            {SOURCE_TYPES.map(({ type, icon, label }) => (
              <button key={type} type="button" onClick={() => setInputType(type)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                  inputType === type
                    ? 'bg-ink-700 text-paper-100 border-ink-700'
                    : 'bg-paper-200 text-ink-600 border-ink-700/10 hover:bg-paper-300'
                }`}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Zone de saisie */}
          {inputType === 'text' ? (
            <textarea
              placeholder="Colle ton texte, tes notes, un extrait de cours..."
              value={inputValue} onChange={e => setInputValue(e.target.value)}
              rows={5}
              className="input resize-none"
            />
          ) : (
            <input
              placeholder={inputPlaceholder}
              value={inputValue} onChange={e => setInputValue(e.target.value)}
              className="input"
            />
          )}

          {/* Miniature YouTube */}
          {inputType === 'youtube' && inputValue && getYoutubeThumbnail(inputValue) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getYoutubeThumbnail(inputValue)!}
              alt="Miniature YouTube"
              className="rounded-xl w-full max-w-xs border border-ink-700/10"
            />
          )}

          <input
            placeholder="Titre optionnel pour cette source"
            value={inputTitle} onChange={e => setInputTitle(e.target.value)}
            className="input"
          />

          <button type="button" onClick={addSource} className="btn-secondary">
            + Ajouter cette source
          </button>
        </div>

        {/* ── Sources ajoutées ── */}
        {sources.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink-500">
              {sources.length} source{sources.length > 1 ? 's' : ''} ajoutée{sources.length > 1 ? 's' : ''}
            </p>
            {sources.map((s, i) => {
              const meta = SOURCE_TYPES.find(x => x.type === s.type)!
              return (
                <div key={i}
                  className="flex items-center justify-between bg-paper-50 border border-ink-700/10 rounded-xl px-4 py-3"
                  style={{ transform: `rotate(${i % 2 === 0 ? '-0.4deg' : '0.3deg'})` }}
                >
                  <span className="flex items-center gap-2 text-sm text-ink-700">
                    <span>{meta.icon}</span>
                    <span className="font-medium">{meta.label}</span>
                    {s.title && s.title !== s.type && (
                      <span className="text-ink-400">— {s.title}</span>
                    )}
                  </span>
                  <button type="button" onClick={() => removeSource(i)}
                    className="text-rust-500 hover:text-rust-600 text-xs font-medium transition-colors">
                    Retirer
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Erreur ── */}
        {error && (
          <p className="text-rust-600 text-sm bg-rust-500/8 border border-rust-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* ── Soumettre ── */}
        <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
          {loading ? '⏳ Analyse IA en cours...' : '🧠 Analyser et créer le cours'}
        </button>

      </form>
    </div>
  )
}
