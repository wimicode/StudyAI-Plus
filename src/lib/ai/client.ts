// ============================================================
// StudyAI Plus – Generic AI Client
// Compatible with any OpenAI-style API
// Configure via: LLM_API_URL, LLM_API_KEY, LLM_MODEL
// ============================================================

const LLM_API_URL = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions'
const LLM_API_KEY = process.env.LLM_API_KEY || ''
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function chat(messages: Message[], temperature = 0.7, attempt = 1): Promise<string> {
  const MAX_ATTEMPTS = 3
  const res = await fetch(LLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      temperature,
      max_tokens: 4096,
    }),
  })

  if (res.status === 429 && attempt < MAX_ATTEMPTS) {
    const errBody = await res.text()
    // Le message Groq contient "Please try again in 15.64s" — on extrait ce délai
    const match = /try again in ([\d.]+)s/.exec(errBody)
    const waitSeconds = match ? parseFloat(match[1]) + 1 : 20 // +1s de marge de sécurité
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000))
    return chat(messages, temperature, attempt + 1)
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AI API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const match = raw.match(/```json\n?([\s\S]*?)\n?```/) || raw.match(/({[\s\S]*}|\[[\s\S]*\])/)
    return JSON.parse(match ? match[1] : raw) as T
  } catch {
    return fallback
  }
}

// ============================================================
// VISION OCR – lit le texte (imprimé ou manuscrit) dans une image
// via Groq (Qwen 3.6 27B Vision). Utilisé pour les PDF scannés.
// Réutilise la même clé que le LLM texte (LLM_API_KEY) si elle
// pointe déjà vers Groq, sinon configure GROQ_API_KEY séparément.
// ============================================================
const GROQ_VISION_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_VISION_API_KEY = process.env.GROQ_API_KEY || process.env.LLM_API_KEY || ''
const GROQ_VISION_MODEL = 'qwen/qwen3.6-27b'

/** Erreur qui préserve le vrai code HTTP (ex: 429 rate limit) pour que
 *  l'appelant (route API) puisse le propager au client plutôt que de
 *  toujours renvoyer 500. */
export class VisionOcrError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'VisionOcrError'
  }
}

export async function visionOcr(imageBase64: string, mimeType: 'image/png' | 'image/jpeg' = 'image/jpeg'): Promise<string> {
  if (!GROQ_VISION_API_KEY) {
    throw new Error('GROQ_API_KEY (ou LLM_API_KEY) manquante — impossible de lire les PDF scannés/manuscrits.')
  }

  const res = await fetch(GROQ_VISION_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_VISION_API_KEY}`,
    },
    signal: AbortSignal.timeout(50_000), // sous la limite maxDuration de 60s de la route
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Retranscris fidèlement tout le texte visible sur cette image (imprimé ou manuscrit). Réponds UNIQUEMENT avec le texte retranscrit, sans commentaire, sans markdown, sans préambule. Si l\'image ne contient aucun texte lisible, réponds exactement: [AUCUN TEXTE]',
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 2048,
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new VisionOcrError(err, res.status)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content ?? ''
  return text.trim() === '[AUCUN TEXTE]' ? '' : text.trim()
}

// ============================================================
// ANALYZE SOURCES – fusionne plusieurs sources en un cours
// ============================================================
export async function analyzeSources(
  sources: Array<{ type: string; content: string; title?: string }>,
  subject: string,
  level: string,
  language: string
) {
  const sourcesText = sources
    .map((s, i) => `[Source ${i + 1} – ${s.type.toUpperCase()}${s.title ? ` : ${s.title}` : ''}]\n${s.content}`)
    .join('\n\n---\n\n')

  const raw = await chat([
    {
      role: 'system',
      content: `Tu es un assistant pédagogique expert. Réponds UNIQUEMENT en JSON valide, sans texte avant ni après.`,
    },
    {
      role: 'user',
      content: `Analyse les sources suivantes pour la matière "${subject}" (niveau: ${level}, langue: ${language}).

Sources:
${sourcesText}

Génère un JSON avec cette structure EXACTE:
{
  "summary": "résumé HTML structuré avec titres h2/h3 et paragraphes",
  "glossary": [{"term": "", "definition": ""}],
  "key_concepts": [{"concept": "", "explanation": "", "difficulty": "easy|medium|hard"}]
}`,
    },
  ], 0.5)

  return parseJSON(raw, { summary: '', glossary: [], key_concepts: [] })
}

// ============================================================
// FLASHCARDS
// ============================================================
export async function generateFlashcards(
  content: string,
  subject: string,
  level: string,
  language: string,
  count = 20,
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed',
  instructions = ''
) {
  const difficultyLine = difficulty === 'mixed'
    ? 'Mélange les niveaux de difficulté (easy/medium/hard).'
    : `Toutes les flashcards doivent être de difficulté "${difficulty}".`

  const raw = await chat([
    { role: 'system', content: 'Tu es un assistant pédagogique. Réponds UNIQUEMENT en JSON valide.' },
    {
      role: 'user',
      content: `Génère ${count} flashcards pour "${subject}" (niveau: ${level}, langue: ${language}) basées sur ce contenu:

${content.slice(0, 6000)}

${difficultyLine}
${instructions ? `Instructions supplémentaires de l'utilisateur : ${instructions}` : ''}

JSON attendu: [{"front": "", "back": "", "difficulty": "easy|medium|hard"}]`,
    },
  ])
  return parseJSON<Array<{ front: string; back: string; difficulty: string }>>(raw, [])
}

// ============================================================
// QUIZ
// ============================================================
export async function generateQuiz(
  content: string,
  subject: string,
  level: string,
  language: string,
  count = 10,
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed',
  numChoices = 4,
  instructions = ''
) {
  const difficultyLine = difficulty === 'mixed'
    ? 'Mélange les niveaux de difficulté (easy/medium/hard).'
    : `Toutes les questions doivent être de difficulté "${difficulty}".`

  const raw = await chat([
    { role: 'system', content: 'Tu es un assistant pédagogique. Réponds UNIQUEMENT en JSON valide.' },
    {
      role: 'user',
      content: `Génère ${count} questions de quiz pour "${subject}" (niveau: ${level}, langue: ${language}) basées sur:

${content.slice(0, 6000)}

${difficultyLine}
Chaque question à choix multiples doit avoir exactement ${numChoices} options.
${instructions ? `Instructions supplémentaires de l'utilisateur : ${instructions}` : ''}

JSON attendu:
[{
  "question": "",
  "type": "mcq|true_false",
  "options": ["A","B","C","D"],
  "correct": "A",
  "explanation": ""
}]`,
    },
  ])
  return parseJSON<Array<{ question: string; type: string; options: string[]; correct: string; explanation: string }>>(raw, [])
}

// ============================================================
// EXAM
// ============================================================
export async function generateExam(
  content: string,
  subject: string,
  level: string,
  language: string,
  durationMinutes = 60,
  userInstructions = ''
) {
  const raw = await chat([
    { role: 'system', content: 'Tu es un professeur. Réponds UNIQUEMENT en JSON valide.' },
    {
      role: 'user',
      content: `Génère un examen blanc de ${durationMinutes} minutes pour "${subject}" (niveau: ${level}, langue: ${language}).

Contenu de référence:
${content.slice(0, 6000)}

${userInstructions ? `Instructions supplémentaires de l'utilisateur : ${userInstructions}` : ''}

JSON attendu:
{
  "title": "",
  "duration": ${durationMinutes},
  "instructions": "",
  "sections": [{
    "title": "",
    "questions": [{
      "id": "",
      "question": "",
      "type": "mcq|open|true_false",
      "options": [],
      "points": 0
    }]
  }]
}`,
    },
  ])
  return parseJSON(raw, { title: '', duration: durationMinutes, instructions: '', sections: [] })
}

// ============================================================
// GRADE EXAM
// ============================================================
export async function gradeExam(
  exam: object,
  answers: Record<string, string>,
  subject: string,
  language: string
) {
  const raw = await chat([
    { role: 'system', content: 'Tu es un correcteur bienveillant. Réponds UNIQUEMENT en JSON valide.' },
    {
      role: 'user',
      content: `Corrige cet examen de "${subject}" (langue: ${language}).

Examen: ${JSON.stringify(exam)}
Réponses: ${JSON.stringify(answers)}

JSON attendu:
{
  "score": 0,
  "total": 0,
  "percentage": 0,
  "grade": "",
  "feedback": "",
  "corrections": [{"question_id": "", "correct": true, "explanation": ""}]
}`,
    },
  ])
  return parseJSON(raw, { score: 0, total: 0, percentage: 0, grade: '', feedback: '', corrections: [] })
}

// ============================================================
// STUDY PLAN
// ============================================================
export async function generateStudyPlan(
  exams: Array<{ subject: string; exam_date: string }>,
  courses: Array<{ title: string; subject: string }>,
  weeksCount: number,
  dailyHours: number,
  restDays: string[],
  language: string
) {
  const raw = await chat([
    { role: 'system', content: 'Tu es un coach scolaire. Réponds UNIQUEMENT en JSON valide.' },
    {
      role: 'user',
      content: `Génère un planning de révision sur ${weeksCount} semaines.

Examens: ${JSON.stringify(exams)}
Cours: ${JSON.stringify(courses)}
Heures/jour: ${dailyHours}
Jours de repos: ${restDays.join(', ')}
Langue: ${language}

JSON attendu:
[{
  "week": 1,
  "days": [{
    "date": "YYYY-MM-DD",
    "sessions": [{
      "subject": "",
      "duration_minutes": 0,
      "mode": "lecture|flashcards|quiz|exam",
      "notes": ""
    }]
  }]
}]`,
    },
  ])
  return parseJSON(raw, [])
}
