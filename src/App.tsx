import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type AiResponse = {
  text?: string;
  error?: string;
};

type StudyMode = 'summary' | 'flashcards' | 'quiz';
type Page = 'study' | 'lessons' | 'otherMaterials' | 'tutor' | 'account' | 'flashcards' | 'quiz';

type Flashcard = {
  front: string;
  back: string;
};

type QuizQuestion = {
  question: string;
  answer: string;
};

type FlashcardResponse = {
  flashcards?: Flashcard[];
};

type SavedLesson = {
  id: string;
  title: string;
  material: string;
  sources?: string[];
  savedAt: string;
};

type SharedMaterial = {
  id: string;
  subject: string;
  title: string;
  material: string;
  created_at: string;
  user_id: string | null;
};

type TutorMessage = {
  role: 'user' | 'tutor';
  text: string;
};

type AuthMode = 'signIn' | 'signUp';

const savedLessonsKey = 'study-helper-lessons';
const maxSavedLessons = 6;

const modes: { id: StudyMode; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'quiz', label: 'Quiz me' },
];

const demoQuiz: QuizQuestion[] = [
  {
    question: 'What is the purpose of taking notes while studying?',
    answer: 'hi',
  },
  {
    question: 'What does a summary do?',
    answer: 'hi',
  },
  {
    question: 'Why are flashcards useful?',
    answer: 'hi',
  },
  {
    question: 'What should you do after getting a quiz question wrong?',
    answer: 'hi',
  },
  {
    question: 'What is active recall?',
    answer: 'hi',
  },
];

function getButtonLabel(mode: StudyMode, isLoading: boolean) {
  if (isLoading) return 'Thinking...';
  if (mode === 'flashcards') return 'Make flashcards';
  if (mode === 'quiz') return 'Make quiz';
  return 'Summarize';
}

function parseAiJson<T>(text: string): T | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

function makeLessonPreview(material: string) {
  const compactMaterial = material.replace(/\s+/g, ' ').trim();
  if (compactMaterial.length <= 92) return compactMaterial;
  return `${compactMaterial.slice(0, 92)}...`;
}

function getLessonSources(lesson: SavedLesson) {
  return lesson.sources?.length ? lesson.sources : [lesson.material];
}

function getLessonMaterial(lesson: SavedLesson) {
  return getLessonSources(lesson).join('\n\n');
}

function getWordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function getPasswordErrors(password: string) {
  const errors = [];

  if (password.length < 8) errors.push('At least 8 characters');
  if (!/\d/.test(password)) errors.push('Must include numbers');
  if (!/[A-Z]/.test(password)) errors.push('Must include at least one capital letter');

  return errors;
}

function readSavedLessons() {
  try {
    const rawLessons = window.localStorage.getItem(savedLessonsKey);
    if (!rawLessons) return [];
    const parsed = JSON.parse(rawLessons) as SavedLesson[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [page, setPage] = useState<Page>('study');
  const [mode, setMode] = useState<StudyMode>('summary');
  const [lessonName, setLessonName] = useState('');
  const [material, setMaterial] = useState('');
  const [savedLessons, setSavedLessons] = useState<SavedLesson[]>([]);
  const [summary, setSummary] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [showQuizAnswers, setShowQuizAnswers] = useState(false);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(true);
  const [addingSourceId, setAddingSourceId] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sharedMaterials, setSharedMaterials] = useState<SharedMaterial[]>([]);
  const [sharedSubject, setSharedSubject] = useState('');
  const [sharedTitle, setSharedTitle] = useState('');
  const [sharedText, setSharedText] = useState('');
  const [sharedError, setSharedError] = useState('');
  const [sharedNotice, setSharedNotice] = useState('');
  const [isSharedLoading, setIsSharedLoading] = useState(false);
  const [isUploadingSharedMaterial, setIsUploadingSharedMaterial] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [accountNameInput, setAccountNameInput] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountNotice, setAccountNotice] = useState('');
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([
    {
      role: 'tutor',
      text: 'Ask me about your study material, or ask for help understanding a topic.',
    },
  ]);
  const [tutorQuestion, setTutorQuestion] = useState('');
  const [tutorError, setTutorError] = useState('');
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const materialTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const searchedSharedMaterials = sharedMaterials.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return `${item.subject} ${item.title} ${item.material}`.toLowerCase().includes(query);
  });
  const currentAccountName = session?.user.user_metadata.display_name || session?.user.email || '';
  const passwordErrors = getPasswordErrors(accountPassword);
  const currentFlashcard = flashcards[currentFlashcardIndex];

  useEffect(() => {
    setSavedLessons(readSavedLessons());
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (page === 'otherMaterials') {
      loadSharedMaterials();
    }
  }, [page]);

  useEffect(() => {
    const textarea = materialTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [material]);

  useEffect(() => {
    if (page !== 'flashcards') return;

    function handleFlashcardKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (event.code === 'Space' && !isTyping) {
        event.preventDefault();
        setIsFlashcardFlipped((isFlipped) => !isFlipped);
      }

      if (event.code === 'ArrowRight' && !isTyping) {
        event.preventDefault();
        setCurrentFlashcardIndex((index) => (index + 1) % flashcards.length);
        setIsFlashcardFlipped(false);
      }

      if (event.code === 'ArrowLeft' && !isTyping) {
        event.preventDefault();
        setCurrentFlashcardIndex((index) => (index === 0 ? flashcards.length - 1 : index - 1));
        setIsFlashcardFlipped(false);
      }
    }

    window.addEventListener('keydown', handleFlashcardKeyDown);
    return () => window.removeEventListener('keydown', handleFlashcardKeyDown);
  }, [flashcards.length, page]);

  function updateSavedLessons(nextLessons: SavedLesson[]) {
    setSavedLessons(nextLessons);
    window.localStorage.setItem(savedLessonsKey, JSON.stringify(nextLessons));
  }

  function clearResults() {
    setSummary('');
    setFlashcards([]);
    setCurrentFlashcardIndex(0);
    setIsFlashcardFlipped(false);
    setQuiz([]);
    setQuizAnswers([]);
    setShowQuizAnswers(false);
    setIsQuizSubmitted(false);
  }

  function goHome() {
    setPage('study');
    setError('');
    setNotice('');
  }

  async function loadSharedMaterials() {
    setSharedError('');

    if (!isSupabaseConfigured) {
      setSharedError('Connect Supabase first so shared materials can load from the internet.');
      return;
    }

    setIsSharedLoading(true);
    const { data, error: loadError } = await supabase
      .from('shared_materials')
      .select('id, subject, title, material, created_at, user_id')
      .order('created_at', { ascending: false });
    setIsSharedLoading(false);

    if (loadError) {
      setSharedError(loadError.message);
      return;
    }

    setSharedMaterials(data ?? []);
  }

  async function uploadSharedMaterial() {
    const subject = sharedSubject.trim();
    const title = sharedTitle.trim();
    const text = sharedText.trim();

    if (!session) {
      setSharedError('Sign in to your account before uploading material.');
      setSharedNotice('');
      setAccountNotice('Sign in or create an account first, then you can upload material.');
      setPage('account');
      return;
    }

    if (!subject || !title || !text) {
      setSharedError('Add a subject, title, and material before uploading.');
      setSharedNotice('');
      return;
    }

    if (!isSupabaseConfigured) {
      setSharedError('Connect Supabase first so this can upload to the internet.');
      setSharedNotice('');
      return;
    }

    setIsSharedLoading(true);
    setSharedError('');
    setSharedNotice('');

    const { error: uploadError } = await supabase.from('shared_materials').insert({
      subject,
      title,
      material: text,
      user_id: session.user.id,
    });

    setIsSharedLoading(false);

    if (uploadError) {
      setSharedError(uploadError.message);
      return;
    }

    setSharedSubject('');
    setSharedTitle('');
    setSharedText('');
    setIsUploadingSharedMaterial(false);
    setSharedNotice('Material uploaded for other students.');
    loadSharedMaterials();
  }

  async function deleteSharedMaterial(item: SharedMaterial) {
    if (!session || item.user_id !== session.user.id) {
      setSharedError('You can only delete materials you uploaded.');
      setSharedNotice('');
      return;
    }

    setIsSharedLoading(true);
    setSharedError('');
    setSharedNotice('');

    const { error: deleteError } = await supabase
      .from('shared_materials')
      .delete()
      .eq('id', item.id)
      .eq('user_id', session.user.id);

    setIsSharedLoading(false);

    if (deleteError) {
      setSharedError(deleteError.message);
      return;
    }

    setSharedMaterials(sharedMaterials.filter((materialItem) => materialItem.id !== item.id));
    setSharedNotice('Material deleted.');
  }

  async function submitAccount() {
    const email = accountEmail.trim();
    const password = accountPassword;
    const displayName = accountNameInput.trim();

    if (!isSupabaseConfigured) {
      setAccountError('Connect Supabase first so accounts can work.');
      return;
    }

    if (!email || !password || (authMode === 'signUp' && !displayName)) {
      setAccountError(authMode === 'signUp' ? 'Add your name, email, and password.' : 'Add your email and password.');
      setAccountNotice('');
      return;
    }

    if (authMode === 'signUp' && passwordErrors.length > 0) {
      setAccountError(`Password needs: ${passwordErrors.join(', ')}.`);
      setAccountNotice('');
      return;
    }

    setAccountError('');
    setAccountNotice('');

    if (authMode === 'signUp') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName.slice(0, 50),
          },
        },
      });

      if (signUpError) {
        setAccountError(signUpError.message);
        return;
      }

      setSession(data.session);
      setAccountNotice(data.session ? 'Account created. You can upload materials now.' : 'Account created. Check your email if Supabase asks you to confirm it.');
      setAccountPassword('');
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setAccountError(signInError.message);
      return;
    }

    setSession(data.session);
    setAccountNotice('Signed in. You can upload materials now.');
    setAccountPassword('');
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setAccountError(signOutError.message);
      return;
    }

    setSession(null);
    setAccountNotice('Signed out.');
    setAccountError('');
  }

  function useSharedMaterial(item: SharedMaterial) {
    setLessonName(item.title);
    setMaterial(item.material);
    setPage('study');
    setNotice(`Loaded "${item.title}".`);
    setError('');
    clearResults();
  }

  async function askTutor() {
    const question = tutorQuestion.trim();

    if (!question) {
      setTutorError('Type a question for the tutor first.');
      return;
    }

    if (!isSupabaseConfigured) {
      setTutorError('Connect Supabase first so the AI tutor can answer.');
      return;
    }

    const nextMessages: TutorMessage[] = [...tutorMessages, { role: 'user', text: question }];
    setTutorMessages(nextMessages);
    setTutorQuestion('');
    setTutorError('');
    setIsTutorLoading(true);

    const materialContext = material.trim()
      ? `Current lesson name: ${lessonName || 'Untitled lesson'}\n\nStudy material:\n${material.trim()}`
      : 'No study material has been pasted yet.';

    const savedLessonsContext = savedLessons.length
      ? savedLessons
          .map((lesson, index) => {
            const lessonMaterial = getLessonMaterial(lesson);
            return `Saved lesson ${index + 1}: ${lesson.title}\n${lessonMaterial}`;
          })
          .join('\n\n---\n\n')
      : 'No saved lessons yet.';

    const recentChat = nextMessages
      .slice(-8)
      .map((message) => `${message.role === 'user' ? 'Student' : 'Tutor'}: ${message.text}`)
      .join('\n\n');

    const { data, error: invokeError } = await supabase.functions.invoke<AiResponse>('ai', {
      body: {
        prompt: `Tutor primarily from the saved lessons. Use the current pasted material too when it is relevant. Answer like a patient tutor, not just a summary bot.

Saved lessons:
${savedLessonsContext}

Current material:
${materialContext}

Recent chat:
${recentChat}

Student question:
${question}`,
        system: 'You are a friendly AI tutor. Prioritize the student saved lessons over general knowledge. Explain step by step, keep answers clear, ask one follow-up question when useful, and do not invent facts outside the provided material unless the student asks for general explanation.',
      },
    });

    setIsTutorLoading(false);

    if (invokeError) {
      setTutorError(invokeError.message);
      return;
    }

    if (data?.error) {
      setTutorError(data.error);
      return;
    }

    setTutorMessages([
      ...nextMessages,
      {
        role: 'tutor',
        text: data?.text?.trim() || 'I did not get an answer back. Try asking again.',
      },
    ]);
  }

  function chooseMode(nextMode: StudyMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
    clearResults();
  }

  function showPreviousFlashcard() {
    setCurrentFlashcardIndex((index) => (index === 0 ? flashcards.length - 1 : index - 1));
    setIsFlashcardFlipped(false);
  }

  function showNextFlashcard() {
    setCurrentFlashcardIndex((index) => (index + 1) % flashcards.length);
    setIsFlashcardFlipped(false);
  }

  function submitQuiz() {
    setIsQuizSubmitted(true);
    setShowQuizAnswers(true);
  }

  function saveLesson() {
    const trimmedName = lessonName.trim();
    const trimmedMaterial = material.trim();

    if (!trimmedName) {
      setError('Name your lesson before saving.');
      setNotice('');
      return;
    }

    if (!trimmedMaterial) {
      setError('Paste your study material before saving.');
      setNotice('');
      return;
    }

    const nextLesson: SavedLesson = {
      id: crypto.randomUUID(),
      title: trimmedName.slice(0, 60),
      material: trimmedMaterial,
      sources: [trimmedMaterial],
      savedAt: new Date().toISOString(),
    };

    updateSavedLessons([nextLesson, ...savedLessons].slice(0, maxSavedLessons));
    setError('');
    setNotice('Lesson saved.');
  }

  function loadLesson(lesson: SavedLesson) {
    setLessonName(lesson.title);
    setMaterial(getLessonMaterial(lesson));
    setError('');
    setNotice(`Loaded "${lesson.title}".`);
    setPage('study');
    clearResults();
  }

  function deleteLesson(id: string) {
    updateSavedLessons(savedLessons.filter((lesson) => lesson.id !== id));
    setNotice('Lesson deleted.');
    setError('');
  }

  function startAddingSource(id: string) {
    setAddingSourceId(id);
    setSourceText('');
    setError('');
    setNotice('');
  }

  function cancelAddingSource() {
    setAddingSourceId(null);
    setSourceText('');
  }

  function addSourceToLesson(lesson: SavedLesson) {
    const trimmedSource = sourceText.trim();

    if (!trimmedSource) {
      setError('Paste another source before adding it.');
      setNotice('');
      return;
    }

    const nextLessons = savedLessons.map((item) => {
      if (item.id !== lesson.id) return item;
      const nextSources = [...getLessonSources(item), trimmedSource];
      return {
        ...item,
        material: nextSources.join('\n\n'),
        sources: nextSources,
      };
    });

    updateSavedLessons(nextLessons);
    setAddingSourceId(null);
    setSourceText('');
    setError('');
    setNotice(`Added another source to "${lesson.title}".`);
  }

  function buildPrompt(trimmedMaterial: string) {
    if (mode === 'flashcards') {
      return `Turn these study notes into 6 useful flashcards.

Return only valid JSON in this exact shape:
{
  "flashcards": [
    { "front": "question or term", "back": "short answer or definition" }
  ]
}

Study material:
${trimmedMaterial}`;
    }

    if (mode === 'quiz') {
      return `Create a short study quiz from these notes.

Return only valid JSON in this exact shape:
{
  "quiz": [
    { "question": "short quiz question", "answer": "correct answer" }
  ]
}

Make 5 questions. Study material:
${trimmedMaterial}`;
    }

    return `Summarize these study notes clearly and quickly.

Use this format:
- 4 to 6 short bullet points
- Key terms
- One quick review question

Study material:
${trimmedMaterial}`;
  }

  async function generateStudyHelp() {
    const trimmedMaterial = material.trim();

    if (mode === 'quiz') {
      setError('');
      setNotice('Showing a demo quiz until AI is connected.');
      setSummary('');
      setFlashcards([]);
      setCurrentFlashcardIndex(0);
      setIsFlashcardFlipped(false);
      setQuiz(demoQuiz);
      setQuizAnswers(demoQuiz.map(() => ''));
      setShowQuizAnswers(false);
      setIsQuizSubmitted(false);
      setPage('quiz');
      return;
    }

    if (!trimmedMaterial) {
      setError('Paste your study material first.');
      setNotice('');
      clearResults();
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local first.');
      setNotice('');
      clearResults();
      return;
    }

    setIsLoading(true);
    setError('');
    setNotice('');
    clearResults();

    const { data, error: invokeError } = await supabase.functions.invoke<AiResponse>('ai', {
      body: {
        prompt: buildPrompt(trimmedMaterial),
        system: 'You are a helpful study assistant. Keep explanations short, clear, and easy for a student to review.',
      },
    });

    setIsLoading(false);

    if (invokeError) {
      setError(invokeError.message);
      return;
    }

    if (data?.error) {
      setError(data.error);
      return;
    }

    const text = data?.text?.trim() ?? '';

    if (mode === 'flashcards') {
      const parsed = parseAiJson<FlashcardResponse>(text);
      const nextCards = parsed?.flashcards ?? [];
      if (nextCards.length === 0) {
        setError('The AI did not return flashcards. Try again with more detailed notes.');
        return;
      }
      setFlashcards(nextCards);
      setCurrentFlashcardIndex(0);
      setIsFlashcardFlipped(false);
      setPage('flashcards');
      return;
    }

    setSummary(text || 'No summary came back. Try again with a little more text.');
  }

  return (
    <main className="app-shell">
      <section className="study-tool">
        <div className="intro">
          <div>
            <p className="eyebrow">Study helper</p>
            <h1>
              {page === 'lessons'
                ? 'Lessons'
                : page === 'otherMaterials'
                  ? 'Other Materials'
                  : page === 'tutor'
                    ? 'AI Tutor'
                    : page === 'account'
                      ? 'Account'
                      : page === 'flashcards'
                        ? 'Flashcards'
                        : page === 'quiz'
                          ? 'Quiz'
                      : 'Study Helper'}
            </h1>
          </div>
          <div className="header-actions">
            {page === 'study' && (
              <button className="nav-button" type="button" onClick={() => setIsOptionsOpen(!isOptionsOpen)}>
                Study options
              </button>
            )}
            {page === 'otherMaterials' ? (
              !isUploadingSharedMaterial && (
                <button
                  className="add-material-button"
                  type="button"
                  onClick={() => {
                    if (!session) {
                      setAccountNotice('Sign in or create an account first, then you can upload material.');
                      setPage('account');
                      return;
                    }
                    setIsUploadingSharedMaterial(true);
                    setSharedError('');
                    setSharedNotice('');
                  }}
                  aria-label="Upload material"
                >
                  +
                </button>
              )
            ) : page !== 'account' && page !== 'lessons' ? (
              <button className="nav-button" type="button" onClick={() => setPage('lessons')}>
                Lessons
              </button>
            ) : null}
          </div>
        </div>

        {page === 'otherMaterials' ? (
          <section className="other-materials-page" aria-label="Other materials">
            {isUploadingSharedMaterial ? (
              <div className="share-panel">
                <div className="lessons-page-heading compact-heading">
                  <div>
                    <h2>Upload material</h2>
                    <p>Share notes by subject so other students can find them.</p>
                  </div>
                  <button className="small-button muted-button" type="button" onClick={() => setIsUploadingSharedMaterial(false)}>
                    Cancel
                  </button>
                </div>

                <div className="share-form">
                  <label className="field">
                    <span>Subject</span>
                    <input
                      value={sharedSubject}
                      onChange={(event) => setSharedSubject(event.target.value)}
                      placeholder="Example: Biology"
                    />
                  </label>
                  <label className="field">
                    <span>Title</span>
                    <input
                      value={sharedTitle}
                      onChange={(event) => setSharedTitle(event.target.value)}
                      placeholder="Example: Cell structure notes"
                    />
                  </label>
                  <label className="field">
                    <span>Material</span>
                    <textarea
                      value={sharedText}
                      onChange={(event) => setSharedText(event.target.value)}
                      placeholder="Paste the material you want to share..."
                    />
                  </label>
                <button className="generate-button" type="button" onClick={uploadSharedMaterial} disabled={isSharedLoading}>
                  {isSharedLoading ? 'Uploading...' : 'Upload material'}
                </button>
                {sharedError && <p className="message">{sharedError}</p>}
                {sharedNotice && <p className="notice">{sharedNotice}</p>}
              </div>
            </div>
            ) : (
              <div className="browse-panel">
                <div className="browse-heading">
                  <label className="field">
                    <span>Find materials</span>
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by subject, title, or text..."
                    />
                  </label>
                </div>

                {sharedError && <p className="message">{sharedError}</p>}
                {sharedNotice && <p className="notice">{sharedNotice}</p>}

                <div className="search-results">
                  {searchedSharedMaterials.length === 0 ? (
                    <p className="empty-state large">No shared materials found.</p>
                  ) : (
                    searchedSharedMaterials.map((item) => (
                      <article className="lesson-card-large" key={item.id}>
                        <div className="lesson-copy">
                          <p className="card-label">{item.subject}</p>
                          <h3>{item.title}</h3>
                          <p className="lesson-preview">{makeLessonPreview(item.material)}</p>
                          <p className="lesson-meta">
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            <span>{getWordCount(item.material)} words</span>
                          </p>
                        </div>
                        <div className={session?.user.id === item.user_id ? 'lesson-actions two-actions' : 'lesson-actions one-action'}>
                          <button className="small-button" type="button" onClick={() => useSharedMaterial(item)}>
                            Use material
                          </button>
                          {session?.user.id === item.user_id && (
                            <button
                              className="small-button danger-button"
                              type="button"
                              onClick={() => deleteSharedMaterial(item)}
                              disabled={isSharedLoading}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>
        ) : page === 'account' ? (
          <section className="account-page" aria-label="Account page">
            <div className="account-panel">
              <div className="account-avatar" aria-hidden="true">
                <svg viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" />
                  <circle cx="32" cy="24" r="9" />
                  <path d="M17 52c2-12 8-18 15-18s13 6 15 18" />
                </svg>
              </div>
              <div>
                <h2>Your account</h2>
                <p>{session ? `Signed in as ${currentAccountName}.` : 'Sign in or create an account so you can upload materials.'}</p>
                {session ? (
                  <div className="account-form">
                    {accountNotice && <p className="notice">{accountNotice}</p>}
                    {accountError && <p className="message">{accountError}</p>}
                  </div>
                ) : (
                  <div className="account-form">
                    <div className="auth-tabs" aria-label="Account mode">
                      <button
                        className={authMode === 'signIn' ? 'auth-tab active' : 'auth-tab'}
                        type="button"
                        onClick={() => {
                          setAuthMode('signIn');
                          setAccountError('');
                          setAccountNotice('');
                        }}
                      >
                        Sign in
                      </button>
                      <button
                        className={authMode === 'signUp' ? 'auth-tab active' : 'auth-tab'}
                        type="button"
                        onClick={() => {
                          setAuthMode('signUp');
                          setAccountError('');
                          setAccountNotice('');
                        }}
                      >
                        Create account
                      </button>
                    </div>
                    {authMode === 'signUp' && (
                      <label className="field">
                        <span>Name</span>
                        <input
                          value={accountNameInput}
                          onChange={(event) => setAccountNameInput(event.target.value)}
                          placeholder="Your name"
                        />
                      </label>
                    )}
                    <label className="field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={accountEmail}
                        onChange={(event) => setAccountEmail(event.target.value)}
                        placeholder="you@example.com"
                      />
                    </label>
                    <label className="field">
                      <span>Password</span>
                      <div className="password-field">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={accountPassword}
                          onChange={(event) => setAccountPassword(event.target.value)}
                          placeholder="Password"
                        />
                        <button
                          className="show-password-button"
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </label>
                    {authMode === 'signUp' && (
                      <ul className="password-rules" aria-label="Password rules">
                        <li className={accountPassword.length >= 8 ? 'met' : ''}>At least 8 characters</li>
                        <li className={/\d/.test(accountPassword) ? 'met' : ''}>Must include numbers</li>
                        <li className={/[A-Z]/.test(accountPassword) ? 'met' : ''}>Must include at least one capital letter</li>
                      </ul>
                    )}
                    <button className="generate-button" type="button" onClick={submitAccount}>
                      {authMode === 'signUp' ? 'Create account' : 'Sign in'}
                    </button>
                    {accountNotice && <p className="notice">{accountNotice}</p>}
                    {accountError && <p className="message">{accountError}</p>}
                  </div>
                )}
              </div>
              {session && (
                <button className="sign-out-button" type="button" onClick={signOut}>
                  Sign out
                </button>
              )}
            </div>
          </section>
        ) : page === 'lessons' ? (
          <section className="lessons-page" aria-label="All saved lessons">
            <div className="lessons-page-heading">
              <div>
                <h2>Saved lessons</h2>
                <p>{savedLessons.length} of {maxSavedLessons} lesson slots used</p>
              </div>
            </div>

            {savedLessons.length === 0 ? (
              <p className="empty-state large">No saved lessons yet.</p>
            ) : (
              <div className="lessons-page-grid">
                {savedLessons.map((lesson) => {
                  const lessonMaterial = getLessonMaterial(lesson);
                  const sourceCount = getLessonSources(lesson).length;

                  return (
                    <article className="lesson-card-large" key={lesson.id}>
                      <div className="lesson-copy">
                        <h3>{lesson.title}</h3>
                        <p className="lesson-preview">{makeLessonPreview(lessonMaterial)}</p>
                        <p className="lesson-meta">
                          <span>{new Date(lesson.savedAt).toLocaleDateString()}</span>
                          <span>{getWordCount(lessonMaterial)} words</span>
                          <span>{sourceCount} {sourceCount === 1 ? 'source' : 'sources'}</span>
                        </p>
                      </div>

                      {addingSourceId === lesson.id && (
                        <div className="source-form">
                          <textarea
                            value={sourceText}
                            onChange={(event) => setSourceText(event.target.value)}
                            placeholder="Paste another source for this topic..."
                          />
                          <div className="source-actions">
                            <button className="small-button" type="button" onClick={() => addSourceToLesson(lesson)}>
                              Add source
                            </button>
                            <button className="small-button muted-button" type="button" onClick={cancelAddingSource}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="lesson-actions">
                        <button className="small-button" type="button" onClick={() => loadLesson(lesson)}>
                          Load
                        </button>
                        <button className="small-button" type="button" onClick={() => startAddingSource(lesson.id)}>
                          Add another source
                        </button>
                        <button className="small-button danger-button" type="button" onClick={() => deleteLesson(lesson.id)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : page === 'tutor' ? (
          <section className="tutor-page" aria-label="AI tutor chat">
            <div className="tutor-chat">
              {tutorMessages.map((message, index) => (
                <article className={`tutor-message ${message.role}`} key={`${message.role}-${index}`}>
                  <p className="card-label">{message.role === 'user' ? 'You' : 'Tutor'}</p>
                  <p>{message.text}</p>
                </article>
              ))}
              {isTutorLoading && (
                <article className="tutor-message tutor">
                  <p className="card-label">Tutor</p>
                  <p>Thinking...</p>
                </article>
              )}
            </div>

            <div className="tutor-input-panel">
              <label className="field">
                <span>Ask the tutor</span>
                <textarea
                  value={tutorQuestion}
                  onChange={(event) => setTutorQuestion(event.target.value)}
                  placeholder="Ask about your notes, a confusing idea, or what to study next..."
                />
              </label>
              <button className="generate-button" type="button" onClick={askTutor} disabled={isTutorLoading}>
                {isTutorLoading ? 'Asking...' : 'Ask tutor'}
              </button>
              {tutorError && <p className="message">{tutorError}</p>}
            </div>
          </section>
        ) : page === 'flashcards' ? (
          <section className="flashcards-page" aria-label="Flashcards page">
            <div className="lessons-page-heading">
              <div>
                <h2>Flashcards</h2>
                <p>{flashcards.length} cards ready to review</p>
              </div>
              <button className="small-button" type="button" onClick={() => setPage('study')}>
                Back to study
              </button>
            </div>

            {notice && <p className="notice page-notice">{notice}</p>}

            {flashcards.length === 0 ? (
              <p className="empty-state large">No flashcards yet.</p>
            ) : (
              <div className="flashcard-reviewer">
                <p className="flashcard-count">
                  {currentFlashcardIndex + 1} / {flashcards.length}
                </p>
                <button
                  className={isFlashcardFlipped ? 'review-flashcard flipped' : 'review-flashcard'}
                  type="button"
                  onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
                  aria-label={isFlashcardFlipped ? 'Show flashcard front' : 'Show flashcard back'}
                >
                  <span className="card-label">{isFlashcardFlipped ? 'Back' : 'Front'}</span>
                  <span className="review-flashcard-text">
                    {isFlashcardFlipped ? currentFlashcard.back : currentFlashcard.front}
                  </span>
                </button>
                <div className="flashcard-controls">
                  <button className="small-button arrow-button" type="button" onClick={showPreviousFlashcard} aria-label="Previous flashcard">
                    &lt;-
                  </button>
                  <button className="small-button arrow-button" type="button" onClick={showNextFlashcard} aria-label="Next flashcard">
                    -&gt;
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : page === 'quiz' ? (
          <section className="quiz-page" aria-label="Quiz page">
            <div className="lessons-page-heading">
              <div>
                <h2>Quiz</h2>
                <p>{quiz.length} questions ready to answer</p>
              </div>
              <button className="small-button" type="button" onClick={() => setPage('study')}>
                Back to study
              </button>
            </div>

            {notice && <p className="notice page-notice">{notice}</p>}

            {quiz.length === 0 ? (
              <p className="empty-state large">No quiz yet.</p>
            ) : (
              <div className="quiz-page-body">
                <div className="result-heading">
                  <h2>Quiz</h2>
                  <p className="quiz-status">{isQuizSubmitted ? 'Submitted' : 'Not submitted yet'}</p>
                </div>

                <div className="quiz-list">
                  {quiz.map((item, index) => (
                    <article className="quiz-item" key={`${item.question}-${index}`}>
                      <label>
                        <span>{index + 1}. {item.question}</span>
                        <input
                          value={quizAnswers[index] ?? ''}
                          onChange={(event) => {
                            const nextAnswers = [...quizAnswers];
                            nextAnswers[index] = event.target.value;
                            setQuizAnswers(nextAnswers);
                            setIsQuizSubmitted(false);
                            setShowQuizAnswers(false);
                          }}
                          placeholder="Type your answer..."
                        />
                      </label>
                      {showQuizAnswers && (
                        <p className={quizAnswers[index]?.trim().toLowerCase() === item.answer.toLowerCase() ? 'answer correct-answer' : 'answer wrong-answer'}>
                          {quizAnswers[index]?.trim().toLowerCase() === item.answer.toLowerCase()
                            ? 'Correct'
                            : `Not quite. Correct answer: ${item.answer}`}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
                <button className="generate-button quiz-submit-button" type="button" onClick={submitQuiz}>
                  Submit answers
                </button>
              </div>
            )}
          </section>
        ) : (
          <>
            <div className={isOptionsOpen ? 'workspace' : 'workspace options-closed'}>
              <aside className={isOptionsOpen ? 'study-options' : 'study-options collapsed'} aria-label="Study options">
                <div className="options-heading">
                  <h2>Options</h2>
                </div>

                {isOptionsOpen && (
                  <div className="mode-list" aria-label="Study mode">
                    {modes.map((item) => (
                      <button
                        className={mode === item.id ? 'mode-card active' : 'mode-card'}
                        key={item.id}
                        onClick={() => chooseMode(item.id)}
                        type="button"
                      >
                        {item.label}
                      </button>
                    ))}
                    <button className="mode-card" type="button" onClick={() => setPage('tutor')}>
                      AI Tutor
                    </button>
                  </div>
                )}
              </aside>

              <div className="editor-panel">
                <label className="field lesson-name-field">
                  <span>Lesson name</span>
                  <input
                    value={lessonName}
                    onChange={(event) => setLessonName(event.target.value)}
                    placeholder="Example: Biology chapter 4"
                  />
                </label>

                <label className="field">
                  <span>Study material</span>
                  <textarea
                    ref={materialTextareaRef}
                    value={material}
                    onChange={(event) => setMaterial(event.target.value)}
                    placeholder="Paste notes, textbook paragraphs, or class material here..."
                  />
                </label>

                <div className="action-row">
                  <button className="generate-button" type="button" onClick={generateStudyHelp} disabled={isLoading}>
                    {getButtonLabel(mode, isLoading)}
                  </button>
                  <button className="save-button" type="button" onClick={saveLesson}>
                    Save lesson
                  </button>
                </div>

                {error && <p className="message">{error}</p>}
                {notice && <p className="notice">{notice}</p>}
              </div>
            </div>

            {summary && (
              <section className="result" aria-label="Generated summary">
                <h2>Quick summary</h2>
                <pre>{summary}</pre>
              </section>
            )}

          </>
        )}
      </section>

      <button className="home-button" type="button" onClick={goHome} aria-label="Go to study home">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M8 34L32 12l24 22" />
          <path d="M16 30v24h16V40h12v14h4V30" />
          <path d="M22 22v-8h8v2" />
        </svg>
      </button>
      <button
        className="bottom-icon-button search-button"
        type="button"
        onClick={() => setPage('otherMaterials')}
        aria-label="Open other materials page"
      >
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="27" cy="27" r="17" />
          <path d="M40 40l16 16" />
        </svg>
      </button>
      <button
        className="bottom-icon-button account-button"
        type="button"
        onClick={() => setPage('account')}
        aria-label="Open account page"
      >
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="26" />
          <circle cx="32" cy="24" r="9" />
          <path d="M17 52c2-12 8-18 15-18s13 6 15 18" />
        </svg>
      </button>
    </main>
  );
}
