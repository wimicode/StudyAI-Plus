import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen text-ink-700">
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-ink-500 border border-ink-700/15 bg-paper-50 rounded-full px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          Fait pour réviser, pas pour défiler
        </div>

        <h1 className="text-5xl md:text-6xl font-serif font-semibold leading-tight mb-6 text-ink-800">
          Tes cours,<br />
          transformés en <span className="highlight">fiches qui collent</span>
        </h1>

        <p className="text-lg text-ink-500 mb-4 max-w-2xl mx-auto leading-relaxed">
          Importe un PDF, une vidéo YouTube, un texte ou une photo de cours. StudyAI-Plus en tire des flashcards, des quiz et un examen blanc, prêts à réviser.
        </p>
        <p className="text-sm text-ink-400 mb-12">
          Inspiré par{' '}
          <a href="https://github.com/lucgus11/StudyAI" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-600">
            StudyAI de lucgus11
          </a>
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: '📄', label: 'PDF' },
            { icon: '🎬', label: 'YouTube' },
            { icon: '📝', label: 'Texte libre' },
            { icon: '🖼️', label: 'Images' },
          ].map(({ icon, label }) => (
            <div key={label} className="bg-paper-50 rounded-xl p-4 border border-ink-700/10 shadow-[0_1px_2px_rgba(43,38,32,0.05)] -rotate-1 even:rotate-1">
              <div className="text-3xl mb-2">{icon}</div>
              <div className="text-sm font-medium text-ink-600">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/auth/register"
            className="bg-ink-700 hover:bg-ink-800 text-paper-100 font-semibold px-8 py-3 rounded-xl transition-all"
          >
            Commencer
          </Link>
          <Link
            href="/auth/login"
            className="bg-paper-50 hover:bg-paper-200 text-ink-700 font-semibold px-8 py-3 rounded-xl border border-ink-700/15 transition-all"
          >
            Se connecter
          </Link>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-6 text-left">
          {[
            { icon: '🧠', title: 'IA avancée', desc: 'Résumés, flashcards, quiz et examens générés automatiquement depuis tes sources.' },
            { icon: '📅', title: 'Planning IA', desc: 'Donne tes dates d’examens et l’IA génère ton planning de révision sur mesure.' },
            { icon: '⬇️', title: 'Export hors-ligne', desc: 'Télécharge tes flashcards pour les garder sur ton PC ou ton Drive, même sans connexion.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="card text-left">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-serif text-lg mb-2 text-ink-800">{title}</h3>
              <p className="text-ink-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
