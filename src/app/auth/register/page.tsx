'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) { setError(error.message); setLoading(false); }
    else router.push('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-1">🎓</h1>
          <h2 className="text-2xl font-bold text-white">StudyAI<span className="text-primary-500">-Plus</span></h2>
          <p className="text-slate-400 text-sm mt-1">Crée ton compte gratuitement</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Prénom &amp; Nom</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="input" placeholder="Daniel Kysylov" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="ton@email.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="Minimum 6 caractères" required minLength={6} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
          <p className="text-center text-slate-400 text-sm">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="text-primary-400 hover:underline">Se connecter</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
