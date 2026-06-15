// ============================================================
// Client IA générique — compatible OpenAI, NVIDIA NIM, Groq...
// Configurer via variables d'environnement :
//   LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
// ============================================================

const API_KEY  = process.env.LLM_API_KEY
const BASE_URL = process.env.LLM_BASE_URL || 'https://integrate.api.nvidia.com/v1'
const MODEL    = process.env.LLM_MODEL    || 'meta/llama-3.1-70b-instruct'

export type AIMessage = { role: 'system' | 'user' | 'assistant'; content: string }

async function callLLM(messages: AIMessage[], maxTokens = 2048): Promise<string> {
  if (!API_KEY) throw new Error('LLM_API_KEY is not set')

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LLM error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

function parseJSON<T>(raw: string): T {
  const match = raw.match(/```json\s*([\s\S]*?)\s*```/) ||
                raw.match(/```\s*([\s\S]*?)\s*```/) ||
                [null, raw]
  try {
    return JSON.parse(match[1] ?? raw) as T
  } catch {
    throw new Error('Invalid JSON from LLM: ' + raw.slice(0, 200))
  }
}

// ============================================================
// Analyse et fusion de sources multiples
// ============================================================
export async function analyzeSources(contents: string[], subject: string, level = 'high_school', lang = 'fr') {
  const combinedContent = contents.join('\n\n--- Nouvelle source ---\n\n').slice(0, 12000)
  const raw = await callLLM([
    {
      role: 'system',
      content: `Tu es un professeur expert. Analyse les sources fournies (cours, transcriptions, notes) et crée un cours structuré en ${lang}. Niveau : ${level}. Retourne un JSON valide.`,
    },
    {
      role: 'user',
      content: `Matière : ${subject}\n\n${combinedContent}\n\nRetourne un JSON avec les champs : summary (string), glossary (tableau {term, definition}), key_concepts (tableau {concept, explanation}).`,
    },
  ], 3000)
  return parseJSON<{ summary: string; glossary: { term: string; definition: string }[]; key_concepts: { concept: string; explanation: string }[] }>(raw)
}

// ============================================================
// Flashcards
// ============================================================
export async function generateFlashcards(summary: string, subject: string, lang = 'fr') {
  const raw = await callLLM([
    {
      role: 'system',
      content: `Tu es un professeur. Crée 20 flashcards en ${lang} pour réviser un cours. Retourne uniquement un tableau JSON.`,
    },
    {
      role: 'user',
      content: `Matière : ${subject}\n\n${summary.slice(0, 6000)}\n\nRetourne un tableau JSON : [{front: string, back: string}]`,
    },
  ])
  return parseJSON<{ front: string; back: string }[]>(raw)
}

// ============================================================
// Quiz
// ============================================================
export async function generateQuiz(summary: string, subject: string, lang = 'fr') {
  const raw = await callLLM([
    {
      role: 'system',
      content: `Tu es un professeur. Crée 10 questions de quiz en ${lang} (7 QCM + 3 Vrai/Faux). Retourne uniquement un tableau JSON.`,
    },
    {
      role: 'user',
      content: `Matière : ${subject}\n\n${summary.slice(0, 6000)}\n\nRetourne un tableau JSON : [{question, type ('mcq'|'truefalse'), options (tableau de strings pour QCM), correctAnswer (string), explanation}]`,
    },
  ])
  return parseJSON<{ question: string; type: 'mcq' | 'truefalse'; options?: string[]; correctAnswer: string; explanation: string }[]>(raw)
}

// ============================================================
// Examen blanc
// ============================================================
export async function generateExam(summary: string, subject: string, durationMinutes = 60, lang = 'fr') {
  const raw = await callLLM([
    {
      role: 'system',
      content: `Tu es un professeur. Crée un examen blanc complet de ${durationMinutes} minutes en ${lang}. Retourne uniquement un JSON valide.`,
    },
    {
      role: 'user',
      content: `Matière : ${subject}\n\n${summary.slice(0, 6000)}\n\nRetourne un JSON : {title, duration_minutes, instructions, parts: [{title, questions: [{number, question, points, type}]}], total_points}`,
    },
  ], 3000)
  return parseJSON<{
    title: string
    duration_minutes: number
    instructions: string
    parts: { title: string; questions: { number: number; question: string; points: number; type: string }[] }[]
    total_points: number
  }>(raw)
}

// ============================================================
// Correction d’examen
// ============================================================
export async function gradeExam(examJSON: string, answers: string, lang = 'fr') {
  const raw = await callLLM([
    {
      role: 'system',
      content: `Tu es un correcteur bienveillant. Corrige les réponses et donne un feedback détaillé en ${lang}. Retourne un JSON valide.`,
    },
    {
      role: 'user',
      content: `Examen :\n${examJSON}\n\nRéponses de l'élève :\n${answers}\n\nRetourne un JSON : {score, total, percentage, global_feedback, corrections: [{question_number, student_answer, correct_answer, is_correct, feedback, points_earned}]}`,
    },
  ], 3000)
  return parseJSON<{
    score: number
    total: number
    percentage: number
    global_feedback: string
    corrections: { question_number: number; student_answer: string; correct_answer: string; is_correct: boolean; feedback: string; points_earned: number }[]
  }>(raw)
}

// ============================================================
// Plan de révision
// ============================================================
export async function generateStudyPlan(params: {
  subjects: string[]
  examDates: { subject: string; date: string }[]
  weeksCount: number
  dailyHours: number
  restDays: string[]
  lang?: string
}) {
  const { subjects, examDates, weeksCount, dailyHours, restDays, lang = 'fr' } = params
  const raw = await callLLM([
    {
      role: 'system',
      content: `Tu es un coach scolaire. Crée un planning de révision personnalisé en ${lang}. Retourne uniquement un tableau JSON.`,
    },
    {
      role: 'user',
      content: `Matières : ${subjects.join(', ')}\nDates d'examens : ${JSON.stringify(examDates)}\nDurée : ${weeksCount} semaines\nHeures/jour : ${dailyHours}\nJours de repos : ${restDays.join(', ')}\n\nRetourne un tableau JSON : [{week, day, date, subject, duration_hours, task, tips}]`,
    },
  ], 4000)
  return parseJSON<{ week: number; day: string; date: string; subject: string; duration_hours: number; task: string; tips: string }[]>(raw)
}
