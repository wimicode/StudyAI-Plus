'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseYoutubeUrl, getYoutubeThumbnail as buildYoutubeThumbnail } from '@/lib/parsers/parseYoutubeUrl'
import { isGoogleDriveUrl } from '@/lib/parsers/parseDriveUrl'
import type { SourceType } from '@/types'

type SourceForm = { type: SourceType; value: string; title: string }

function isYoutubeUrl(url: string) {
  try {
    const u = new URL(url)
    return u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')
  } catch {
    return false
  }
}

function extractYoutubeId(url: string) {
  return parseYoutubeUrl(url)
}

export default function SourcesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [sources, setSources]     = useState<SourceForm[]>([])
  const [courseTitle, setCourseTitle] = useState('')
  const [subject, setSubject]     = useState('')
  const [level, setLevel]         = useState('high_school')
  const [lang, setLang]           = useState('fr')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const [inputType, setInputType] = useState<SourceType>('text')
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
    setLoading(true)
    setError(null)
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

  function getSourceIcon(type: SourceType) {
    const icons: Record<SourceType, string> = { pdf: '📄', youtube: '🎬', drive: '📦', text: '📝', image: '🖼️' }
    return icons[type]
  }

  function getYoutubeThumbnail(value: string) {
    if (!isYoutubeUrl(value)) return null
    const id = extractYoutubeId(value)
    return id ? buildYoutubeThumbnail(id) : null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-purple-900 text-white px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">📥 Nouvelle source</h1>
        <p className="text-purple-300 mb-8">Ajoute une ou plusieurs sources, puis l'IA créera ton cours.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">📖 Infos du cours</h2>
            <input
              placeholder="Titre du cours (ex: Cours de Thermodynamique)" value={courseTitle}
              onChange={e => setCourseTitle(e.target.value)} required
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              placeholder="Matière (ex: Physique)" value={subject}
              onChange={e => setSubject(e.target.value)} required
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="grid grid-cols-2 gap-4">
              <select value={level} onChange={e => setLevel(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="primary">Primaire</option>
                <option value="middle">Collège</option>
                <option value="high_school">Lycée</option>
                <option value="university">Université</option>
              </select>
              <select value={lang} onChange={e => setLang(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">📎 Ajouter des sources</h2>
            <div className="flex gap-2 flex-wrap">
              {(['text', 'youtube', 'pdf', 'drive', 'image'] as SourceType[]).map(t => (
                <button key={t} type="button"
                  onClick={() => setInputType(t)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    inputType === t ? 'bg-purple-600 text-white' : 'bg-white/10 text-purple-300 hover:bg-white/20'
                  }`}>
                  {getSourceIcon(t)} {t}
                </button>
              ))}
            </div>

            {inputType === 'text' ? (
              <textarea
                placeholder="Colle ton texte, tes notes, un extrait de cours..."
                value={inputValue} onChange={e => setInputValue(e.target.value)}
                rows={5}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            ) : (
              <input
                placeholder={
                  inputType === 'youtube' ? 'https://youtube.com/watch?v=...' :
                  inputType === 'drive'   ? 'https://drive.google.com/file/d/...' :
                  inputType === 'pdf'     ? 'URL du PDF (depuis Supabase Storage)' :
                  "URL de l'image"
                }
                value={inputValue} onChange={e => setInputValue(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            )}

            {inputType === 'youtube' && inputValue && getYoutubeThumbnail(inputValue) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={getYoutubeThumbnail(inputValue)!} alt="thumbnail" className="rounded-xl w-full max-w-xs" />
            )}

            <input
              placeholder="Titre optionnel pour cette source"
              value={inputTitle} onChange={e => setInputTitle(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            <button type="button" onClick={addSource}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl text-sm font-medium transition-all">
              + Ajouter cette source
            </button>
          </div>

          {sources.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-purple-300">{sources.length} source(s) ajoutée(s)</h3>
              {sources.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-white/10 border border-white/20 rounded-xl px-4 py-3">
                  <span>{getSourceIcon(s.type)} <span className="text-sm">{s.title || s.type}</span></span>
                  <button type="button" onClick={() => removeSource(i)} className="text-red-400 hover:text-red-300 text-sm">× Retirer</button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl p-3">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all text-lg">
            {loading ? '⏳ Analyse IA en cours...' : '🧠 Analyser et créer le cours'}
          </button>
        </form>
      </div>
    </div>
  )
}
