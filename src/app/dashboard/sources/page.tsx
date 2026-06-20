'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseYoutubeUrl, getYoutubeThumbnail as buildYoutubeThumbnail } from '@/lib/parsers/parseYoutubeUrl'
import { processPdfClientSide } from '@/lib/pdf/processPdf'
import type { SourceType } from '@/types'

type SourceForm = { type: SourceType; value: string; title: string }

const SOURCE_TYPES: { type: SourceType; icon: string; label: string }[] = [
  { type: 'text',    icon: '📝', label: 'Texte'   },
  { type: 'youtube', icon: '🎬', label: 'YouTube' },
  { type: 'pdf',     icon: '📄', label: 'PDF'     },
  { type: 'drive',   icon: '📁', label: 'Drive'   },
  { type: 'image',   icon: '🖼️', label: 'Image'   },
]

const LEVELS = [
  { value: '1s',  label: '1re secondaire' },
  { value: '2s',  label: '2e secondaire'  },
  { value: '3s',  label: '3e secondaire'  },
  { value: '4s',  label: '4e secondaire'  },
  { value: '5s',  label: '5e secondaire'  },
  { value: '6s',  label: '6e secondaire'  },
  { value: 'uni', label: 'Université / Haute École' },
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
  const [sources, setSources]         = useState<SourceForm[]>([])
  const [courseTitle, setCourseTitle] = useState('')
  const [subject, setSubject]         = useState('')
  const [level, setLevel]             = useState('6s')
  const [lang, setLang]               = useState('fr')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [inputType, setInputType]     = useState<SourceType>('text')
  const [inputValue, setInputValue]   = useState('')
  const [inputTitle, setInputTitle]   = useState('')
  const [pdfLoading, setPdfLoading]   = useState(false)
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null)
  const [pdfNotice, setPdfNotice]     = useState<string | null>(null)
  const [isDragging, setIsDragging]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Upload PDF — traitement 100% côté navigateur ────────────
  // Le PDF n'est jamais envoyé en entier au serveur : on extrait le texte
  // natif localement, et si besoin, on envoie chaque PAGE (image légère)
  // séparément à l'OCR vision. Aucune limite de taille de fichier PDF.
  async function processPdfFile(file: File) {
    if (file.type !== 'application/pdf') {
      setError('Seuls les fichiers PDF sont acceptés.')
      return
    }
    setPdfLoading(true)
    setError(null)
    setPdfNotice(null)
    setPdfProgress(null)
    try {
      const result = await processPdfClientSide(file, (current, total) => {
        setPdfProgress({ current, total })
      })
      setSources(prev => [...prev, {
        type: 'text',
        value: result.text,
        title: file.name.replace('.pdf', '') || 'PDF importé',
      }])
      setPdfNotice(
        result.method === 'vision-ocr'
          ? `📄 PDF scanné détecté — lu par l'IA (${result.pageCount} page${result.pageCount > 1 ? 's' : ''}).`
          : `✅ Texte extrait directement (${result.pageCount} page${result.pageCount > 1 ? 's' : ''}).`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la lecture du PDF')
    } finally {
      setPdfLoading(false)
      setPdfProgress(null)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processPdfFile(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)

  // ── Autres sources ──────────────────────────────────────────
  function addSource() {
    if (!inputValue.trim()) return
    setSources(prev => [...prev, {
      type: inputType,
      value: inputValue,
      title: inputTitle || inputType,
    }])
    setInputValue('')
    setInputTitle('')
  }

  function removeSource(i: number) {
    setSources(prev => prev.filter((_, idx) => idx !== i))
  }

  // ── Soumission ──────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (sources.length === 0) { setError('Ajoute au moins une source.'); return }
    if (!courseTitle.trim()) { setError('Donne un titre au cours.'); return }
    setLoading(true); setError(null)
    try {
      // On envoie le token explicitement en header, en plus du cookie :
      // ça évite les erreurs "Auth session missing!" si le cookie de session
      // n'est pas correctement transmis/lu côté serveur.
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/sources/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
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

  const inputPlaceholder =
    inputType === 'youtube' ? 'https://youtube.com/watch?v=...' :
    inputType === 'drive'   ? 'https://drive.google.com/file/d/...' :
    inputType === 'image'   ? "URL de l'image" : ''

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl font-semibold text-ink-800 mb-1">Nouvelle source</h1>
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
              {LEVELS.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <select value={lang} onChange={e => setLang(e.target.value)} className="input">
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>

        {/* ── PDF glisser-déposer ── */}
        <div className="card space-y-3">
          <h2 className="font-serif text-lg text-ink-800">Importer un PDF</h2>
          <p className="text-ink-400 text-xs">
            Le texte est extrait automatiquement et envoyé à l&apos;IA. Les PDFs scannés (images) ne fonctionnent pas.
          </p>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-primary-400 bg-primary-50'
                : 'border-ink-700/20 hover:border-primary-300 hover:bg-paper-200/50'
            }`}
          >
            <input
              ref={fileInputRef} type="file" accept="application/pdf"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processPdfFile(f) }}
            />
            {pdfLoading ? (
              <p className="text-ink-500 text-sm">
                {pdfProgress
                  ? `⏳ Lecture par IA — page ${pdfProgress.current}/${pdfProgress.total}...`
                  : '⏳ Lecture du PDF en cours...'}
              </p>
            ) : (
              <>
                <p className="text-3xl mb-2">📄</p>
                <p className="text-sm font-medium text-ink-600">Glisse un PDF ici</p>
                <p className="text-xs text-ink-400 mt-1">texte ou scanné/manuscrit — traité directement dans ton navigateur</p>
              </>
            )}
          </div>
          {pdfNotice && (
            <p className="text-xs text-brand-600 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
              {pdfNotice}
            </p>
          )}
        </div>

        {/* ── Autres sources ── */}
        <div className="card space-y-4">
          <h2 className="font-serif text-lg text-ink-800">Autres sources</h2>

          <div className="flex gap-2 flex-wrap">
            {SOURCE_TYPES.filter(s => s.type !== 'pdf').map(({ type, icon, label }) => (
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

          {/* Avertissement Drive */}
          {inputType === 'drive' && (
            <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 text-xs text-ink-600 leading-relaxed">
              <p className="font-semibold mb-1">📁 Lien Google Drive</p>
              Le fichier doit être partagé en <strong>accès restreint</strong> ou <strong>public</strong>.
              Colle le lien de partage — l&apos;IA recevra l&apos;URL et tentera d&apos;en lire le contenu.
              Pour un accès complet à ton Drive sans rendre le fichier public, un connecteur
              Google Drive OAuth sera nécessaire (fonctionnalité à venir).
            </div>
          )}

          {inputType === 'text' ? (
            <textarea
              placeholder="Colle ton texte, tes notes, un extrait de cours..."
              value={inputValue} onChange={e => setInputValue(e.target.value)}
              rows={5} className="input resize-none"
            />
          ) : (
            <input
              placeholder={inputPlaceholder}
              value={inputValue} onChange={e => setInputValue(e.target.value)}
              className="input"
            />
          )}

          {inputType === 'youtube' && inputValue && getYoutubeThumbnail(inputValue) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getYoutubeThumbnail(inputValue)!} alt="Miniature YouTube"
              className="rounded-xl w-full max-w-xs border border-ink-700/10" />
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
              const meta = SOURCE_TYPES.find(x => x.type === s.type) ?? SOURCE_TYPES[0]
              return (
                <div key={i}
                  className="flex items-center justify-between bg-paper-50 border border-ink-700/10 rounded-xl px-4 py-3"
                  style={{ transform: `rotate(${i % 2 === 0 ? '-0.4deg' : '0.3deg'})` }}
                >
                  <span className="flex items-center gap-2 text-sm text-ink-700">
                    <span>{meta.icon}</span>
                    <span className="font-medium">{meta.label}</span>
                    {s.title && s.title !== s.type && (
                      <span className="text-ink-400 truncate max-w-[180px]">— {s.title}</span>
                    )}
                  </span>
                  <button type="button" onClick={() => removeSource(i)}
                    className="text-rust-500 hover:text-rust-600 text-xs font-medium transition-colors shrink-0 ml-3">
                    Retirer
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <p className="text-rust-600 text-sm bg-rust-500/8 border border-rust-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading || pdfLoading} className="btn-primary w-full py-4 text-base">
          {loading ? '⏳ Analyse IA en cours...' : '🧠 Analyser et créer le cours'}
        </button>

      </form>
    </div>
  )
}
