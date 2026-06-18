'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="bg-paper-50 border border-ink-700/10 rounded-2xl p-8 w-full max-w-md shadow-[0_2px_4px_rgba(43,38,32,0.06),0_12px_32px_rgba(43,38,32,0.08)] -rotate-[0.3deg]">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎓</div>
          <h1 className="font-serif text-2xl font-semibold text-ink-800">Connexion</h1>
          <p className="text-sm text-ink-400 mt-1">Content de te revoir</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            required
            className="input"
          />
          <input
            type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)}
            required
            className="input"
          />
          {error && <p className="text-rust-600 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="text-center text-ink-400 text-sm mt-6">
          Pas de compte ?{' '}
          <Link href="/auth/register" className="text-ink-700 font-medium underline">S&apos;inscrire</Link>
        </p>
      </div>
    </div>
  )
}
