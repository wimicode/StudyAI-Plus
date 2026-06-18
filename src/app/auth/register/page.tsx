'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [fullName, setFullName]   = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/login`,
      },
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 page-with-margin">
      <div className="bg-paper-50 border border-ink-700/10 rounded-2xl p-8 w-full max-w-md shadow-[0_2px_4px_rgba(43,38,32,0.06),0_12px_32px_rgba(43,38,32,0.08)] rotate-[0.3deg]">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎓</div>
          <h1 className="font-serif text-2xl font-semibold text-ink-800">Créer un compte</h1>
          <p className="text-sm text-ink-400 mt-1">Commence à réviser malin</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text" placeholder="Ton prénom" value={fullName} onChange={e => setFullName(e.target.value)}
            className="input"
          />
          <input
            type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            required
            className="input"
          />
          <input
            type="password" placeholder="Mot de passe (6 caractères min.)" value={password} onChange={e => setPassword(e.target.value)}
            required minLength={6}
            className="input"
          />
          {error && <p className="text-rust-600 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>
        <p className="text-center text-ink-400 text-sm mt-6">
          Déjà un compte ?{' '}
          <Link href="/auth/login" className="text-ink-700 font-medium underline">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
