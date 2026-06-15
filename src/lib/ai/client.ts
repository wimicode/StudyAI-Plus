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

async function chat(messages: Message[], temperature = 0.7): Promise<string> {
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
  count = 20
) {
  const raw = await chat([
    { role: 'system', content: 'Tu es un assistant pédagogique. Réponds UNIQUEMENT en JSON valide.' },
    {
      role: 'user',
      content: `Génère ${count} flashcards pour "${subject}" (niveau: ${level}, langue: ${language}) basées sur ce contenu:

${content.slice(0, 6000)}

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
  count = 10
) {
  const raw = await chat([
    { role: 'system', content: 'Tu es un assistant pédagogique. Réponds UNIQUEMENT en JSON valide.' },
    {
      role: 'user',
      content: `Génère ${count} questions de quiz pour "${subject}" (niveau: ${level}, langue: ${language}) basées sur:

${content.slice(0, 6000)}

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
  durationMinutes = 60
) {
  const raw = await chat([
    { role: 'system', content: 'Tu es un professeur. Réponds UNIQUEMENT en JSON valide.' },
    {
      role: 'user',
      content: `Génère un examen blanc de ${durationMinutes} minutes pour "${subject}" (niveau: ${level}, langue: ${language}).

Contenu de référence:
${content.slice(0, 6000)}

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
