'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 page-with-margin">
      <div className="bg-paper-50 border border-ink-700/10 rounded-2xl p-8 w-full max-w-md shadow-[0_2px_4px_rgba(43,38,32,0.06),0_12px_32px_rgba(43,38,32,0.08)] -rotate-[0.4deg] text-center">
        <div className="text-5xl mb-4">📬</div>
        <h1 className="font-serif text-2xl font-semibold text-ink-800 mb-2">
          Vérifie ta boîte mail
        </h1>
        <p className="text-ink-500 leading-relaxed">
          On vient d&apos;envoyer un lien de confirmation
          {email ? (
            <> à <span className="font-medium text-ink-700">{email}</span></>
          ) : (
            ' à ton adresse email'
          )}
          . Clique sur le lien pour activer ton compte.
        </p>
        <p className="text-sm text-ink-400 mt-4">
          Rien reçu ? Vérifie tes spams, ça peut prendre une minute ou deux.
        </p>
        <Link href="/auth/login" className="btn-secondary w-full mt-8 py-3 inline-flex">
          Retour à la connexion
        </Link>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  )
}
