# 🎓 StudyAI Plus – PWA de Révision Intelligente Multi‑Sources

StudyAI Plus est une application web progressive (PWA) pour aider les étudiants à réviser intelligemment grâce à l'IA, en combinant plusieurs types de sources : PDFs, liens YouTube, texte copié‑collé, liens Google Drive, et plus encore.

> 🔎 **Crédit & inspiration**  
> Ce projet est fortement inspiré par **StudyAI – PWA de Révision Intelligente** créé par **lucgus11**  
> Repo original : https://github.com/lucgus11/StudyAI  
> StudyAI Plus est une réécriture et extension avec architecture multi‑sources et couche IA flexible.

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| **Sources multi‑formats** | PDF, lien YouTube, texte collé, lien Google Drive, image de cours |
| **Fusion IA des sources** | L'IA analyse toutes les sources d'un cours et génère résumé + glossaire + concepts clés |
| **Mode Grand Écran** | Résumé structuré, glossaire, concepts clés, notions à revoir |
| **Mode Micro‑Learning** | Flashcards interactives (flip) + mini‑quiz QCM/Vrai‑Faux |
| **Mode Crash Test** | Examen blanc chronométré + correction détaillée + feedback personnalisé |
| **Fiches personnalisées** | Éditeur de fiches par blocs (titre, texte, définition, tableau, timeline, formule…) |
| **Planificateur IA** | Calendrier de révision intelligent basé sur tes examens et disponibilités |
| **Suivi de progression** | Stats par cours : cartes maîtrisées, quiz passés, score moyen, temps de révision |
| **Mode Hors‑ligne** | Cours en IndexedDB, révision sans connexion, sync auto des scores |
| **PWA Installable** | Manifest + Service Worker — installable iOS, Android, desktop |

---

## 🛠️ Stack Technique

- **Frontend** : Next.js 14 (App Router) + TypeScript
- **Style** : Tailwind CSS (mobile‑first) + Framer Motion
- **Auth & BDD** : Supabase (Row Level Security)
- **Stockage fichiers** : Supabase Storage
- **IA** : API compatible OpenAI (NVIDIA NIM, OpenAI GPT‑4, Groq, etc.) – configurable
- **PWA** : next-pwa + Service Worker custom
- **Offline** : IndexedDB via `idb`
- **Déploiement** : Vercel (CI/CD auto depuis GitHub)

---

## 🚀 Déploiement en 4 étapes

### 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → **New project**
2. Dans **SQL Editor**, colle et exécute `supabase/migrations/001_initial_schema.sql`
3. Dans **Storage → New bucket** : nom `course-pdfs`, Public ✅
4. Récupère dans **Project Settings → API** :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Configurer le fournisseur IA

StudyAI Plus utilise n'importe quelle API compatible OpenAI.
Options recommandées :
- [NVIDIA NIM](https://build.nvidia.com) (modèles Llama 3, Mixtral, etc.)
- [OpenAI](https://platform.openai.com) (GPT‑4.1, etc.)
- [Groq](https://console.groq.com) (Llama 3.3 70b, gratuit)

Variables nécessaires :
- `LLM_API_URL` = ex. `https://api.openai.com/v1/chat/completions`
- `LLM_API_KEY` = ta clé API
- `LLM_MODEL` = ex. `gpt-4.1` ou `meta/llama-3-70b-instruct`

### 3. Déployer sur Vercel

1. Va sur [vercel.com](https://vercel.com) → **Import Project** → sélectionne ce repo
2. Dans **Environment Variables**, ajoute :

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `LLM_API_URL` | URL endpoint IA |
| `LLM_API_KEY` | Clé API IA (⚠️ jamais de préfixe NEXT_PUBLIC_) |
| `LLM_MODEL` | Nom du modèle |

3. Clique **Deploy** ✅

### 4. (Optionnel) Développer en local

Si tu as Node.js disponible :
```bash
git clone https://github.com/wimicode/StudyAI-Plus.git
cd StudyAI-Plus
cp .env.local.example .env.local
# Remplis .env.local
npm install
npm run dev
```
Sur Chromebook : utilise **GitHub Codespaces** (bouton Code → Codespaces).

---

## 📁 Structure du projet

```
studyai-plus/
├── public/
│   ├── manifest.json
│   ├── icons/
│   └── sw.js
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── page.tsx
│   │   ├── auth/login/ & register/
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # Stats + accueil
│   │   │   ├── sources/          # Gestion multi‑sources
│   │   │   ├── courses/[id]/     # Hub cours + modes révision
│   │   │   ├── planner/
│   │   │   └── offline/
│   │   └── api/
│   │       ├── sources/ingest/   # POST – ingestion multi‑formats
│   │       ├── courses/[id]/generate/
│   │       ├── courses/[id]/quiz/
│   │       ├── courses/[id]/exam/
│   │       └── planner/generate/
│   ├── components/
│   │   ├── ui/
│   │   ├── sources/              # SourceInputForm, SourceList
│   │   ├── revision/
│   │   ├── planner/
│   │   └── pwa/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── ai/                   # client.ts – fournisseur configurable
│   │   └── db/
│   ├── hooks/
│   └── types/
├── supabase/migrations/001_initial_schema.sql
├── .env.local.example
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

---

## 🧠 Architecture IA

Tous les appels IA sont dans `src/lib/ai/client.ts` :

| Fonction | Description |
|---|---|
| `analyzeSources()` | Fusionne plusieurs sources en un cours cohérent |
| `generateFlashcards()` | Set de flashcards avec difficulté et spaced-repetition |
| `generateQuiz()` | Quiz QCM/Vrai‑Faux avec explications |
| `generateExam()` | Examen blanc chronométré complet |
| `gradeExam()` | Correction + feedback personnalisé |
| `generateStudyPlan()` | Planning de révision sur N semaines |

Le fournisseur se configure via `LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL`.

---

## 📊 Schéma BDD

| Table | Description |
|---|---|
| `profiles` | Profil utilisateur (auto-créé au signup) |
| `courses` | Cours synthétisés avec contenu IA |
| `sources` | Sources multi‑formats liées à un cours |
| `exams` | Examens à venir (date, matière, durée) |
| `study_plans` | Plannings de révision générés |
| `quiz_scores` | Scores flashcard/quiz/exam avec sync offline |
| `sheets` | Fiches personnalisées par blocs |
| `folders` | Dossiers de fiches avec arborescence |

Toutes les tables ont **Row Level Security (RLS)** — chaque user ne voit que ses données.

---

## 🤝 Contribution

1. Fork ce repo
2. Crée ta branche : `git checkout -b feature/ma-feature`
3. Commit : `git commit -m 'feat: ma feature'`
4. Push + Pull Request

---

## 📄 Licence

CC BY 4.0 — Pense à créditer [lucgus11/StudyAI](https://github.com/lucgus11/StudyAI) comme inspiration originale.
