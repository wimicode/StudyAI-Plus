import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="text-6xl mb-6">🎓</div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
          StudyAI-Plus
        </h1>
        <p className="text-xl text-purple-200 mb-4 max-w-2xl mx-auto">
          Ta plateforme de révision intelligente. Importe tes cours depuis n’importe quelle source — PDF, YouTube, texte, images — et l’IA crée tes flashcards, quiz et examens blancs.
        </p>
        <p className="text-sm text-purple-400 mb-12">
          Inspiré par{' '}
          <a href="https://github.com/lucgus11/StudyAI" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-200">
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
            <div key={label} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="text-3xl mb-2">{icon}</div>
              <div className="text-sm font-medium">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/auth/register"
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3 rounded-xl transition-all"
          >
            Commencer gratuitement
          </Link>
          <Link
            href="/auth/login"
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3 rounded-xl border border-white/30 transition-all"
          >
            Se connecter
          </Link>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-6 text-left">
          {[
            { icon: '🧠', title: 'IA Avancée', desc: 'Résumés, flashcards, quiz et examens générés automatiquement depuis tes sources.' },
            { icon: '📱', title: 'PWA Offline', desc: 'Installe l’app sur ton téléphone. Tes cours sont disponibles sans connexion.' },
            { icon: '📅', title: 'Planning IA', desc: 'Donne tes dates d’examens et l’IA génère ton planning de révision sur mesure.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-bold text-lg mb-2">{title}</h3>
              <p className="text-purple-200 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
