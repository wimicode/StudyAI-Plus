# 🎓 StudyAI-Plus — PWA de Révision Intelligente v2

> **Projet inspiré par [StudyAI](https://github.com/lucgus11/StudyAI) de [lucgus11](https://github.com/lucgus11)** — merci pour l'idée originale et l'architecture de départ. StudyAI-Plus est une réécriture étendue avec support multi-sources, IA améliorée et de nombreuses nouvelles fonctionnalités.

---

## ✨ Fonctionnalités

### 📥 Sources d'apprentissage
| Source | Description |
|---|---|
| **PDF** | Upload et analyse automatique de cours en PDF |
| **Lien YouTube** | Colle une URL YouTube, l'IA analyse la transcription |
| **Google Drive** | Lien vers un doc Drive partagé |
| **Texte libre** | Colle tes notes, résumés, extraits de cours |
| **Images** | Photos de fiches manuscrites (OCR à venir) |

Plusieurs sources peuvent être **fusionnées** en un seul cours cohérent.

### 🧠 Modes de révision
| Mode | Description |
|---|---|
| **Grand Écran** | Résumé structuré, glossaire et concepts clés générés par IA |
| **Micro-Learning** | Flashcards interactives (flip) avec spaced repetition |
| **Quiz** | QCM et Vrai/Faux générés automatiquement |
| **Crash Test** | Examen blanc chronométré avec correction IA |

### 📅 Planification
- Planificateur IA basé sur tes examens et disponibilités
- Calendrier de révision personnalisé sur N semaines
- Paramétrable : heures/jour, jours de repos, niveau de difficulté

### 📱 PWA & Offline
- Installable sur iOS et Android
- Cours disponibles hors-ligne via IndexedDB
- Sync automatique des scores quand la connexion revient

### 🔐 Sécurité
- Authentification complète via Supabase Auth
- Row Level Security (RLS) sur toutes les tables
- Clés API jamais exposées côté client

---

## 🛠️ Stack Technique

- **Frontend** : Next.js 14 (App Router) + TypeScript
- **Style** : Tailwind CSS (Mobile-First)
- **Auth & BDD** : Supabase (PostgreSQL + RLS)
- **Stockage fichiers** : Supabase Storage
- **IA** : API compatible OpenAI (NVIDIA NIM, OpenAI, Groq, etc.)
- **PWA** : Service Worker custom + Cache API
- **Offline** : IndexedDB via `idb`
- **Déploiement** : Vercel (CI/CD auto depuis GitHub)

---

## 🚀 Déploiement en 5 étapes

### 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → **New project**
2. Dans **SQL Editor**, colle et exécute le contenu de `supabase/migrations/001_initial_schema.sql`
3. Dans **Storage** → **New bucket** :
   - Nom : `studyai-files`
   - Public : ✅ oui
4. Récupère tes clés dans **Project Settings > API** :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Obtenir une clé API IA

Choisis un fournisseur :
- [NVIDIA NIM](https://build.nvidia.com) → clé gratuite avec accès à des modèles puissants
- [console.groq.com](https://console.groq.com) → Llama 3 70B gratuit
- [platform.openai.com](https://platform.openai.com) → GPT-4o

Copie ta clé → ce sera `LLM_API_KEY`.

Configure aussi dans `.env.local` :
- `LLM_BASE_URL` : URL de l'API (ex. `https://integrate.api.nvidia.com/v1`)
- `LLM_MODEL` : nom du modèle (ex. `meta/llama-3.1-70b-instruct`)

### 3. Cloner et configurer

```bash
git clone https://github.com/wimicode/StudyAI-Plus.git
cd StudyAI-Plus
cp .env.local.example .env.local
# Remplir .env.local avec tes vraies valeurs
```

### 4. Lancer en développement

```bash
npm install
npm run dev
# → http://localhost:3000
```

### 5. Déployer sur Vercel

1. Push le repo sur GitHub
2. Va sur [vercel.com](https://vercel.com) → **Import Project**
3. Dans **Environment Variables**, ajoute :

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de ton projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `LLM_API_KEY` | Clé API du fournisseur IA |
| `LLM_BASE_URL` | URL base de l'API IA |
| `LLM_MODEL` | Nom du modèle IA |

4. Clique **Deploy** ✅

---

## 📁 Structure du Projet

```
studyai-plus/
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing page
│   │   ├── globals.css
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # Vue d'ensemble
│   │   │   ├── sources/          # Gestion multi-sources
│   │   │   ├── courses/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── flashcards/
│   │   │   │       ├── quiz/
│   │   │   │       └── exam/
│   │   │   ├── planner/
│   │   │   └── offline/
│   │   └── api/
│   │       ├── sources/ingest/   # Ingestion multi-sources
│   │       ├── courses/
│   │       │   └── [id]/
│   │       │       ├── generate/
│   │       │       ├── quiz/
│   │       │       └── exam/
│   │       └── planner/
│   ├── components/
│   │   ├── ui/
│   │   ├── sources/
│   │   ├── revision/
│   │   ├── planner/
│   │   └── pwa/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── ai/                   # Client IA générique
│   │   ├── parsers/              # YouTube, Drive, texte
│   │   └── db/                   # IndexedDB + sync
│   ├── hooks/
│   └── types/
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.local.example
├── next.config.js
├── tailwind.config.ts
├── vercel.json
└── README.md
```

---

## 🧠 Architecture IA

Toute la logique IA est dans `src/lib/ai/client.ts`. Le client est **générique** : compatible avec n'importe quel fournisseur qui expose une API au format OpenAI.

| Fonction | Description |
|---|---|
| `analyzeSources()` | Fusionne toutes les sources d'un cours en résumé/glossaire/concepts |
| `generateFlashcards()` | 20 flashcards recto/verso |
| `generateQuiz()` | 10 questions QCM + Vrai/Faux |
| `generateExam()` | Examen blanc complet chronométré |
| `gradeExam()` | Correction + feedback personnalisé |
| `generateStudyPlan()` | Calendrier de révision sur N semaines |

---

## 📊 Schéma Base de Données

```
profiles       → id, email, full_name, avatar_url
courses        → id, user_id, title, subject, summary, glossary, flashcards, quiz_questions
sources        → id, user_id, course_id, type (pdf/youtube/drive/text/image), raw_url, content, status
exams          → id, user_id, subject, exam_date, duration_minutes
study_plans    → id, user_id, plan_data (JSONB), weeks_count, daily_hours, rest_days
quiz_scores    → id, user_id, course_id, mode, score, total, feedback, synced
```

Toutes les tables ont **Row Level Security (RLS)** — les utilisateurs ne voient que leurs propres données.

---

## 🔐 Variables d'Environnement

```env
NEXT_PUBLIC_SUPABASE_URL        = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJhbGci...
LLM_API_KEY                     = ta_cle_api_ia
LLM_BASE_URL                    = https://integrate.api.nvidia.com/v1
LLM_MODEL                       = meta/llama-3.1-70b-instruct
```

> ⚠️ Ne préfixe **jamais** `LLM_API_KEY` avec `NEXT_PUBLIC_` — elle ne doit jamais être exposée côté client.

---

## 📱 Capacités PWA

- **Manifest** : nom, icônes, couleur, shortcuts
- **Service Worker** : cache statiques + fichiers Supabase Storage
- **IndexedDB** : cours hors-ligne (contenu + JSON)
- **Background Sync** : scores synchronisés à la reconnexion
- **Install Prompt** : bannière Android + iOS

---

## 🤝 Contribution

1. Fork le repo
2. `git checkout -b feature/ma-feature`
3. `git commit -m 'feat: description'`
4. `git push origin feature/ma-feature`
5. Ouvre une Pull Request

---

## 🙏 Crédits

Ce projet est inspiré par **[StudyAI](https://github.com/lucgus11/StudyAI)** créé par **[lucgus11](https://github.com/lucgus11)**.
Merci pour l'idée originale, l'architecture de base et le travail accompli sur la v1.

StudyAI-Plus est une version réécriture et étendue, avec support multi-sources, client IA générique et de nombreuses nouvelles fonctionnalités.

---

## 📄 Licence

CC BY 4.0 — voir fichier `LICENSE`
