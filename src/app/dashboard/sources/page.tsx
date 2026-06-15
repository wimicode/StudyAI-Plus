'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isYoutubeUrl, extractYoutubeVideoId } from '@/lib/parsers/parseYoutubeUrl';
import { isDriveUrl } from '@/lib/parsers/parseDriveUrl';
import type { SourceType } from '@/types';
import { FileText, Youtube, Link as LinkIcon, AlignLeft, Image, ArrowRight, Loader2 } from 'lucide-react';

const sourceTypes: { type: SourceType; label: string; icon: React.ElementType; desc: string }[] = [
  { type: 'pdf', label: 'PDF', icon: FileText, desc: 'Importe un fichier PDF de cours' },
  { type: 'youtube', label: 'Vidéo YouTube', icon: Youtube, desc: 'Colle un lien YouTube' },
  { type: 'drive', label: 'Google Drive', icon: LinkIcon, desc: 'Colle un lien Google Docs/Drive' },
  { type: 'text', label: 'Texte libre', icon: AlignLeft, desc: 'Colle ton cours directement' },
  { type: 'image', label: 'Image', icon: Image, desc: 'Importe une image de tes notes' },
];

export default function SourcesPage() {
  const [step, setStep] = useState<'type' | 'input' | 'details'>('type');
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('lycee');
  const [language, setLanguage] = useState('fr');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  function selectType(type: SourceType) {
    setSourceType(type);
    setStep('input');
  }

  function goToDetails() {
    if (sourceType === 'text' && !text.trim()) { setError('Le texte est vide.'); return; }
    if ((sourceType === 'youtube' || sourceType === 'drive') && !url.trim()) { setError('URL manquante.'); return; }
    setError(null);
    setStep('details');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceType || !title || !subject) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // 1. Create the course
      const { data: course, error: courseError } = await supabase
        .from('courses').insert({ user_id: user.id, title, subject, language, level }).select().single();
      if (courseError) throw courseError;

      // 2. Create the source record
      const sourcePayload: Record<string, unknown> = {
        user_id: user.id,
        course_id: course.id,
        type: sourceType,
        title,
        status: 'pending',
      };

      if (sourceType === 'youtube') sourcePayload.raw_url = url;
      if (sourceType === 'drive') sourcePayload.raw_url = url;
      if (sourceType === 'text') sourcePayload.text_content = text;

      // PDF upload
      if (sourceType === 'pdf' && pdfFile) {
        const filePath = `${user.id}/${course.id}/${pdfFile.name}`;
        const { error: uploadError } = await supabase.storage.from('course-pdfs').upload(filePath, pdfFile);
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('course-pdfs').getPublicUrl(filePath);
        sourcePayload.pdf_path = filePath;
        sourcePayload.pdf_url = publicUrl.publicUrl;
      }

      // Image upload
      if (sourceType === 'image' && imageFile) {
        const filePath = `${user.id}/${course.id}/${imageFile.name}`;
        const { error: uploadError } = await supabase.storage.from('course-pdfs').upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('course-pdfs').getPublicUrl(filePath);
        sourcePayload.pdf_url = publicUrl.publicUrl;
      }

      const { error: sourceError } = await supabase.from('sources').insert(sourcePayload);
      if (sourceError) throw sourceError;

      // 3. Trigger AI analysis via API route
      await fetch('/api/sources/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: course.id }),
      });

      router.push(`/dashboard/courses/${course.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Ajouter une source</h2>
        <p className="text-slate-400 mt-1">Choisis comment importer ton contenu de cours</p>
      </div>

      {step === 'type' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sourceTypes.map(({ type, label, icon: Icon, desc }) => (
            <button key={type} onClick={() => selectType(type)}
              className="card text-left hover:border-primary-600 transition-all group">
              <Icon className="text-primary-400 mb-3" size={28} />
              <h3 className="font-semibold text-white group-hover:text-primary-400">{label}</h3>
              <p className="text-sm text-slate-400 mt-1">{desc}</p>
            </button>
          ))}
        </div>
      )}

      {step === 'input' && sourceType && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-white">
            {sourceTypes.find(s => s.type === sourceType)?.label}
          </h3>
          {error && <div className="text-red-400 text-sm">{error}</div>}

          {sourceType === 'pdf' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fichier PDF</label>
              <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
                className="input file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white" />
            </div>
          )}
          {(sourceType === 'youtube' || sourceType === 'drive') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {sourceType === 'youtube' ? 'Lien YouTube' : 'Lien Google Drive'}
              </label>
              <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                className="input" placeholder={sourceType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://docs.google.com/...'} />
            </div>
          )}
          {sourceType === 'text' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Colle ton cours ici</label>
              <textarea value={text} onChange={e => setText(e.target.value)}
                className="input min-h-[200px] resize-y" placeholder="Colle ton texte de cours, notes, résumé..." />
            </div>
          )}
          {sourceType === 'image' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Image (photo de fiche, tableau...)</label>
              <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)}
                className="input file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white" />
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep('type')} className="btn-secondary">Retour</button>
            <button onClick={goToDetails} className="btn-primary flex-1">Suivant <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {step === 'details' && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="font-semibold text-white">Détails du cours</h3>
          {error && <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Titre du cours</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="Ex: Les fonctions de dérivation" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Matière</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} className="input" placeholder="Ex: Mathématiques" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Niveau</label>
              <select value={level} onChange={e => setLevel(e.target.value)} className="input">
                <option value="college">Collège</option>
                <option value="lycee">Lycée</option>
                <option value="bac">Bac</option>
                <option value="superieur">Supérieur</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Langue</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="input">
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('input')} className="btn-secondary">Retour</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Analyse en cours...</> : 'Créer le cours →'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
