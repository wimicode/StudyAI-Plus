import Groq from 'groq-sdk';
import type { Course, Flashcard, QuizQuestion, StudyPlan, GlossaryItem, KeyConcept, StudyDay, Exam } from '@/types';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama3-70b-8192';

async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 4096,
  });
  return response.choices[0]?.message?.content ?? '';
}

function safeParseJSON<T>(raw: string, fallback: T): T {
  try {
    const match = raw.match(/```json\s*([\s\S]*?)```/) ||
                  raw.match(/\{[\s\S]*\}/) ||
                  raw.match(/\[[\s\S]*\]/);
    const json = match ? match[1] ?? match[0] : raw;
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ============================================================
// ANALYSE DE SOURCES (fusion multi-sources)
// ============================================================
export async function generateCourseAnalysis(
  content: string,
  title: string,
  subject: string,
  level: string = 'lycee',
  language: string = 'fr'
): Promise<{ summary: string; glossary: GlossaryItem[]; key_concepts: KeyConcept[] }> {
  const system = `Tu es un expert pédagogique. Tu crées du contenu de révision en ${language} pour un niveau ${level}.
Réponds UNIQUEMENT en JSON valide, sans markdown autour sauf les balises json.`;

  const user = `Analyse ce contenu de cours sur "${title}" (matière: ${subject}) et génère un JSON avec cette structure exacte:
{
  "summary": "Résumé structuré en HTML (h2, p, ul, li) de 400-600 mots",
  "glossary": [{"term": "...", "definition": "..."}],
  "key_concepts": [{"title": "...", "explanation": "..."}]
}

Contenu à analyser:
${content.slice(0, 12000)}`;

  const raw = await callGroq(system, user);
  return safeParseJSON(raw, { summary: raw, glossary: [], key_concepts: [] });
}

// ============================================================
// FLASHCARDS
// ============================================================
export async function generateFlashcards(
  content: string,
  subject: string,
  level: string = 'lycee',
  language: string = 'fr'
): Promise<Flashcard[]> {
  const system = `Tu es un expert pédagogique. Tu crées des flashcards en ${language} pour un niveau ${level}. Réponds UNIQUEMENT en JSON.`;
  const user = `Génère 20 flashcards recto/verso sur "${subject}" à partir de ce contenu.
Format JSON:
[{"id":"1","front":"Question","back":"Réponse","difficulty":"easy|medium|hard"}]

Contenu:
${content.slice(0, 10000)}`;

  const raw = await callGroq(system, user);
  return safeParseJSON<Flashcard[]>(raw, []);
}

// ============================================================
// QUIZ
// ============================================================
export async function generateQuiz(
  content: string,
  subject: string,
  level: string = 'lycee',
  language: string = 'fr'
): Promise<QuizQuestion[]> {
  const system = `Tu es un expert pédagogique. Tu crées des quiz en ${language} pour un niveau ${level}. Réponds UNIQUEMENT en JSON.`;
  const user = `Génère 10 questions (6 QCM + 4 Vrai/Faux) sur "${subject}".
Format JSON:
[{"id":"1","question":"...","type":"mcq","options":["A","B","C","D"],"correct_answer":"A","explanation":"..."}]

Contenu:
${content.slice(0, 10000)}`;

  const raw = await callGroq(system, user);
  return safeParseJSON<QuizQuestion[]>(raw, []);
}

// ============================================================
// EXAMEN BLANC
// ============================================================
export async function generateExam(
  content: string,
  subject: string,
  duration: number = 60,
  level: string = 'lycee',
  language: string = 'fr'
): Promise<QuizQuestion[]> {
  const system = `Tu es un examinateur. Tu crées un examen blanc en ${language} pour un niveau ${level}. Réponds UNIQUEMENT en JSON.`;
  const user = `Génère un examen blanc de ${duration} minutes (15 questions variées) sur "${subject}".
Format JSON:
[{"id":"1","question":"...","type":"mcq|true_false|open","options":[],"correct_answer":"...","explanation":"..."}]

Contenu:
${content.slice(0, 10000)}`;

  const raw = await callGroq(system, user);
  return safeParseJSON<QuizQuestion[]>(raw, []);
}

// ============================================================
// CORRECTION EXAMEN
// ============================================================
export async function gradeExam(
  questions: QuizQuestion[],
  answers: Record<string, string>,
  language: string = 'fr'
): Promise<{ score: number; total: number; feedback: string; details: Array<{ id: string; correct: boolean; explanation: string }> }> {
  const system = `Tu es un correcteur bienveillant. Réponds en ${language}. Réponds UNIQUEMENT en JSON.`;
  const user = `Corrige cet examen et retourne:
{"score": N, "total": ${questions.length}, "feedback": "Message d'encouragement personnalisé", "details": [{"id":"1","correct":true,"explanation":"..."}]}

Questions et réponses correctes: ${JSON.stringify(questions.map(q => ({ id: q.id, correct_answer: q.correct_answer, explanation: q.explanation })))}
Réponses de l'étudiant: ${JSON.stringify(answers)}`;

  const raw = await callGroq(system, user);
  return safeParseJSON(raw, { score: 0, total: questions.length, feedback: '', details: [] });
}

// ============================================================
// PLANNING DE REVISION
// ============================================================
export async function generateStudyPlan(
  exams: Array<{ subject: string; exam_date: string }>,
  courses: Array<{ title: string; subject: string }>,
  weeksCount: number = 4,
  dailyHours: number = 4,
  restDays: string[] = ['saturday', 'sunday'],
  language: string = 'fr'
): Promise<StudyDay[]> {
  const system = `Tu es un coach pédagogique. Tu crées des plannings de révision optimisés en ${language}. Réponds UNIQUEMENT en JSON.`;
  const user = `Crée un planning de révision sur ${weeksCount} semaines.
- Heures dispo/jour: ${dailyHours}h
- Jours de repos: ${restDays.join(', ')}
- Examens: ${JSON.stringify(exams)}
- Cours disponibles: ${JSON.stringify(courses)}

Format JSON: [{"date":"YYYY-MM-DD","tasks":[{"subject":"...","course_title":"...","duration_minutes":60,"mode":"review|flashcard|quiz|exam"}]}]`;

  const raw = await callGroq(system, user);
  return safeParseJSON<StudyDay[]>(raw, []);
}
