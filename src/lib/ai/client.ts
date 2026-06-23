// ============================================================
// StudyAI Plus – Generic AI Client
// Compatible with any OpenAI-style API
// Configure via: LLM_API_URL, LLM_API_KEY, LLM_MODEL
// ============================================================
import type { ExamContent } from '@/types'

const LLM_API_URL = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions'
const LLM_API_KEY = process.env.LLM_API_KEY || ''
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function chat(messages: Message[], temperature = 0.7, maxTokens = 4096, attempt = 1): Promise<string> {
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
      max_tokens: maxTokens,
    }),
  })

  if ((res.status === 429 || res.status === 413) && attempt < MAX_ATTEMPTS) {
    const errBody = await res.text()
    // Le message Groq contient parfois "Please try again in 15.64s" — sinon
    // (cas 413 "Request too large"), retenter ne servira à rien : le contenu
    // doit être réduit en amont (voir MAX_CHARS dans analyzeSources etc.).
    const match = /try again in ([\d.]+)s/.exec(errBody)
    if (!match) {
      throw new Error(`AI API error ${res.status}: ${errBody}`)
    }
    const waitSeconds = parseFloat(match[1]) + 1 // +1s de marge de sécurité
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000))
    return chat(messages, temperature, maxTokens, attempt + 1)
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
export type SummaryLength = 'short' | 'medium' | 'long'
export type SummaryPrecision = 'general' | 'detailed' | 'exhaustive'

const LENGTH_GUIDANCE: Record<SummaryLength, string> = {
  short: 'Résumé concis : 200-400 mots, uniquement les points essentiels.',
  medium: 'Résumé de longueur moyenne : 500-900 mots, bon équilibre entre concision et détail.',
  long: 'Résumé TRÈS COMPLET et détaillé : 1200-2000 mots minimum, couvre TOUS les aspects du contenu en profondeur, avec plusieurs sections (h2/h3), des exemples, des explications développées. Ne résume pas superficiellement — explique vraiment chaque notion en détail, même si le contenu source est court (dans ce cas, développe et contextualise davantage).',
}

const PRECISION_GUIDANCE: Record<SummaryPrecision, string> = {
  general: 'Reste général, vue d\'ensemble sans entrer dans les détails techniques fins.',
  detailed: 'Sois précis sur les définitions, chiffres, dates et mécanismes mentionnés dans les sources.',
  exhaustive: 'Sois exhaustif et rigoureux : reprends toutes les données précises (chiffres, dates, noms, formules, étapes de processus) sans rien omettre.',
}

export async function analyzeSources(
  sources: Array<{ type: string; content: string; title?: string }>,
  subject: string,
  level: string,
  language: string,
  length: SummaryLength = 'long',
  precision: SummaryPrecision = 'detailed',
  focusPoints = ''
) {
  // Limite Groq : 12000 tokens/min sur le tier gratuit (~4 caractères/token
  // en moyenne pour du français). On laisse de la marge pour le prompt
  // système, les instructions, et la réponse elle-même.
  const MAX_CHARS = 16000

  let sourcesText = sources
    .map((s, i) => `[Source ${i + 1} – ${s.type.toUpperCase()}${s.title ? ` : ${s.title}` : ''}]\n${s.content}`)
    .join('\n\n---\n\n')

  if (sourcesText.length > MAX_CHARS) {
    sourcesText = sourcesText.slice(0, MAX_CHARS) + '\n\n[...contenu tronqué pour rester dans la limite de l\'IA...]'
  }

  const raw = await chat([
    {
      role: 'system',
      content: `Tu es un assistant pédagogique expert. Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans balises markdown \`\`\`.`,
    },
    {
      role: 'user',
      content: `Analyse les sources suivantes pour la matière "${subject}" (niveau: ${level}, langue: ${language}).

Sources:
${sourcesText}

CONSIGNES POUR LE RÉSUMÉ :
- ${LENGTH_GUIDANCE[length]}
- ${PRECISION_GUIDANCE[precision]}
${focusPoints ? `- Insiste particulièrement sur : ${focusPoints}` : ''}

Génère un JSON avec EXACTEMENT cette structure. Respecte bien la différence entre glossary et key_concepts :

- "glossary" = liste de MOTS ou TERMES TECHNIQUES courts (1 à 4 mots), chacun avec une définition brève (1-2 phrases). C'est un dictionnaire de vocabulaire, comme en fin de manuel scolaire.
  Exemple : {"term": "Photosynthèse", "definition": "Processus chimique par lequel les plantes convertissent la lumière en énergie."}

- "key_concepts" = liste des IDÉES ou MÉCANISMES IMPORTANTS du cours, expliqués en détail (3-5 phrases), pas juste un mot. C'est ce qu'il faut comprendre en profondeur, pas juste retenir une définition.
  Exemple : {"concept": "Le cycle de Krebs et la production d'énergie", "explanation": "Le cycle de Krebs est une série de réactions chimiques qui se déroulent dans la mitochondrie. Il permet d'extraire l'énergie des nutriments en produisant du NADH et du FADH2, qui seront ensuite utilisés dans la chaîne respiratoire pour produire de l'ATP. Ce processus est central pour comprendre comment les cellules produisent leur énergie.", "difficulty": "medium"}

Ne mets JAMAIS le même contenu dans glossary et key_concepts — glossary = vocabulaire court, key_concepts = explications détaillées.

{
  "summary": "résumé HTML structuré avec balises <h2>, <h3>, <p>, <ul><li> — pas de markdown",
  "glossary": [{"term": "", "definition": ""}],
  "key_concepts": [{"concept": "", "explanation": "", "difficulty": "easy|medium|hard"}]
}`,
    },
  ], 0.5, 7000) // max_tokens augmenté pour permettre un résumé long et complet

  const result = parseJSON(raw, { summary: '', glossary: [], key_concepts: [] })
  return result
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
  questionCount = 10,
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed',
  userInstructions = ''
) {
  const difficultyLine = difficulty === 'mixed'
    ? 'Mélange des questions de difficultés variées (easy/medium/hard).'
    : `Toutes les questions doivent être de difficulté "${difficulty}".`

  const raw = await chat([
    { role: 'system', content: 'Tu es un professeur. Réponds UNIQUEMENT en JSON valide, sans markdown.' },
    {
      role: 'user',
      content: `Génère un examen blanc de ${durationMinutes} minutes, avec exactement ${questionCount} questions au total, pour "${subject}" (niveau: ${level}, langue: ${language}).

Contenu de référence:
${content.slice(0, 6000)}

${userInstructions ? `Instructions supplémentaires de l'utilisateur : ${userInstructions}` : ''}

RÈGLES IMPORTANTES :
- ${questionCount} questions au total, répartie sur une ou plusieurs sections.
- Chaque question a une "difficulty" parmi "easy", "medium", "hard". ${difficultyLine}
- Les "points" dépendent de la difficulté, pas du type de question : easy = 1 point, medium = 2 points, hard = 3 points.
- Pour les questions "mcq" et "true_false", inclus le champ "correctAnswer" avec la bonne réponse exacte (doit correspondre à une valeur de "options").
- Pour les questions "open" (réponse libre), NE PAS mettre "correctAnswer" — la correction se fera séparément par analyse sémantique de la réponse de l'élève.

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
      "correctAnswer": "",
      "difficulty": "easy|medium|hard",
      "points": 0
    }]
  }]
}`,
    },
  ])
  return parseJSON<ExamContent>(raw, { title: '', duration: durationMinutes, instructions: '', sections: [] })
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

// ============================================================
// GRADE OPEN ANSWER – corrige une réponse libre par analyse sémantique
// (accepte une idée juste même si elle n'est pas formulée comme le cours,
// et peut attribuer un score partiel comme 1.5/2 si l'idée est juste mais
// insuffisamment développée).
// ============================================================
export async function gradeOpenAnswer(
  question: string,
  studentAnswer: string,
  maxPoints: number,
  courseContent: string,
  language: string
) {
  if (!studentAnswer.trim()) {
    return { score: 0, maxPoints, feedback: 'Aucune réponse fournie.' }
  }

  const raw = await chat([
    {
      role: 'system',
      content: `Tu es un correcteur d'examen bienveillant mais rigoureux. Tu évalues le FOND (l'idée, la compréhension) et pas la formulation exacte — une réponse reformulée différemment du cours mais sémantiquement correcte doit recevoir le score maximal. Réponds UNIQUEMENT en JSON valide.`,
    },
    {
      role: 'user',
      content: `Question (notée sur ${maxPoints} points) : ${question}

Réponse de l'élève : ${studentAnswer}

Contexte du cours (pour vérifier l'exactitude) :
${courseContent.slice(0, 3000)}

Évalue cette réponse. Le score peut être un nombre décimal (par exemple ${maxPoints / 2} sur ${maxPoints}, ou ${maxPoints - 0.5}) si l'idée est juste mais incomplète ou pas assez développée. Donne un retour court et constructif (1-2 phrases) en ${language}.

JSON attendu:
{"score": 0, "maxPoints": ${maxPoints}, "feedback": ""}`,
    },
  ], 0.3)

  return parseJSON(raw, { score: 0, maxPoints, feedback: 'Correction indisponible.' })
}
