import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type AiResponse = {
  text?: string;
  error?: string;
};

type StudyMode = 'summary' | 'flashcards' | 'quiz';
type Page =
  | 'starter'
  | 'study'
  | 'lessons'
  | 'otherMaterials'
  | 'tutor'
  | 'account'
  | 'flashcards'
  | 'quiz'
  | 'focusTimer'
  | 'progress'
  | 'notes'
  | 'calculator'
  | 'calendar'
  | 'leaderboard'
  | 'studyMethods';
type Language = 'en' | 'ru' | 'kk';
type Theme = 'light' | 'dark';
type TimerMode = 'focus' | 'break';
type CalculatorOperator = '+' | '-' | '*' | '/' | '^';

type Flashcard = {
  front: string;
  back: string;
};

type QuizQuestion = {
  question: string;
  answer: string;
  area?: string;
};

type FlashcardResponse = {
  flashcards?: Flashcard[];
};

type QuizResponse = {
  quiz?: QuizQuestion[];
};

type QuizGrade = {
  correct: boolean;
  feedback: string;
};

type QuizGradeResponse = {
  grades?: QuizGrade[];
};

type KnowledgeAreaStat = {
  area: string;
  attempts: number;
  correct: number;
  mistakes: number;
  lastPracticed: string;
};

type LearningTaskId =
  | 'saveLesson'
  | 'summary'
  | 'makeFlashcards'
  | 'reviewFlashcards'
  | 'finishQuiz'
  | 'saveNote'
  | 'focusSession'
  | 'teachPet'
  | 'blurtingReview';

type LearningTaskDefinition = {
  id: LearningTaskId;
  title: string;
  detail: string;
  xp: number;
};

type LearningXpState = {
  totalXp: number;
  completedTaskKeys: string[];
  updatedAt: string;
};

type TutorialStep = {
  title: string;
  body: string;
  page: Page;
  targetSelector: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
};

type TutorialTargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type BlurtingHighlightCategory = 'good' | 'needsWork' | 'wrong';

type BlurtingHighlight = {
  quote: string;
  category: BlurtingHighlightCategory;
  note?: string;
};

type BlurtingReview = {
  highlights?: BlurtingHighlight[];
  good?: string[];
  needsWork?: string[];
  wrong?: string[];
  review?: string;
};

type QuizKeyboardPreference = 'hasKeyboard' | 'englishAnswers';

type QuizKeyboardCheck = {
  material: string;
  languageName: string;
};

type SavedLesson = {
  id: string;
  title: string;
  material: string;
  sources?: string[];
  savedAt: string;
};

type StudyNote = {
  id: string;
  title: string;
  body?: string;
  imageData?: string;
  updatedAt: string;
};

type CalendarEvent = {
  dateKey: string;
  label: string;
  detail: string;
  type: 'lesson' | 'note' | 'quiz' | 'study' | 'intervaling' | 'custom';
  planId?: string;
  customEventId?: string;
};

type IntervalingPlan = {
  id: string;
  title: string;
  startDate: string;
  createdAt: string;
};

type CustomCalendarEvent = {
  id: string;
  title: string;
  dateKey: string;
  note: string;
  createdAt: string;
};

type UserAppState = {
  savedLessons: SavedLesson[];
  savedNotes: StudyNote[];
  studyPet: StudyPet;
  knowledgeStats: KnowledgeAreaStat[];
  intervalingPlans: IntervalingPlan[];
  customCalendarEvents: CustomCalendarEvent[];
  learningXp: LearningXpState;
};

type UserAppStateRow = {
  user_id: string;
  saved_lessons: unknown;
  saved_notes: unknown;
  study_pet: unknown;
  knowledge_stats: unknown;
  intervaling_plans: unknown;
  custom_calendar_events: unknown;
  learning_xp: unknown;
  updated_at: string | null;
};

type SharedMaterial = {
  id: string;
  subject: string;
  title: string;
  material: string;
  created_at: string;
  user_id: string | null;
};

type LeaderboardProfile = {
  user_id: string;
  display_name: string;
  xp: number;
  completed_tasks: number;
  streak: number;
  last_study_date: string | null;
  updated_at: string;
};

type TutorMessage = {
  role: 'user' | 'tutor';
  text: string;
};

type TeachMessage = {
  role: 'user' | 'pet';
  text: string;
};

type AuthMode = 'signIn' | 'signUp';
type PetType = 'cat' | 'dragon' | 'fox' | 'owl';
type EggColor = 'green' | 'gold' | 'blue' | 'red';
type HatchStage = 'ready' | 'cracked' | 'open';

type HatchPopup = {
  eggColor: EggColor;
  petImage: string;
  stage: HatchStage;
};

type StudyPet = {
  streak: number;
  lastStudyDate: string;
  petType: PetType | null;
  petImage: string | null;
  eggColor: EggColor;
  hasChosenEggColor: boolean;
};

type LessonRingStyle = CSSProperties & {
  '--lesson-progress': string;
};

const savedLessonsKey = 'study-helper-lessons';
const savedNotesKey = 'study-helper-notes';
const knowledgeStatsKey = 'study-helper-knowledge-stats';
const intervalingPlansKey = 'study-helper-intervaling-plans';
const customCalendarEventsKey = 'study-helper-calendar-events';
const learningXpKey = 'study-helper-learning-xp';
const tutorialSeenKey = 'study-helper-tutorial-seen';
const languageKey = 'study-helper-language';
const themeKey = 'study-helper-theme';
const studyPetKey = 'study-helper-pet';
const maxSavedLessons = 6;
const maxSavedNotes = 20;
const maxIntervalingPlans = 8;
const maxCustomCalendarEvents = 120;
const noteCanvasWidth = 1200;
const noteCanvasHeight = 720;
const eggWarmDays = 3;
const defaultFocusMinutes = 25;
const defaultBreakMinutes = 5;
const emptyStudyPet: StudyPet = {
  streak: 0,
  lastStudyDate: '',
  petType: null,
  petImage: null,
  eggColor: 'green',
  hasChosenEggColor: false,
};

const emptyLearningXp: LearningXpState = {
  totalXp: 0,
  completedTaskKeys: [],
  updatedAt: '',
};

const learningTaskDefinitions: LearningTaskDefinition[] = [
  {
    id: 'saveLesson',
    title: 'Save a real lesson',
    detail: 'Name and save useful study material.',
    xp: 40,
  },
  {
    id: 'summary',
    title: 'Make a summary',
    detail: 'Use the summary tool on your notes.',
    xp: 10,
  },
  {
    id: 'makeFlashcards',
    title: 'Create flashcards',
    detail: 'Turn notes into review cards.',
    xp: 30,
  },
  {
    id: 'reviewFlashcards',
    title: 'Review a card deck',
    detail: 'Go through the cards until the deck loops.',
    xp: 35,
  },
  {
    id: 'finishQuiz',
    title: 'Submit a quiz',
    detail: 'Answer and check quiz questions.',
    xp: 60,
  },
  {
    id: 'saveNote',
    title: 'Save freehand notes',
    detail: 'Write or draw notes and save them.',
    xp: 25,
  },
  {
    id: 'focusSession',
    title: 'Finish a focus timer',
    detail: 'Complete one focus session.',
    xp: 45,
  },
  {
    id: 'teachPet',
    title: 'Teach your pet',
    detail: 'Explain a topic in the teach method chat.',
    xp: 35,
  },
  {
    id: 'blurtingReview',
    title: 'Do blurting practice',
    detail: 'Write from memory and check it.',
    xp: 50,
  },
];

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Paste your material',
    body: 'Paste notes, a textbook section, or anything you want to learn. You can type here while the tour stays open.',
    page: 'study',
    targetSelector: '[data-tutorial-target="material-box"]',
    placement: 'right',
  },
  {
    title: 'Choose how to study',
    body: 'Open study options to choose summary, flashcards, quiz, or tutor-style study modes.',
    page: 'study',
    targetSelector: '[data-tutorial-target="study-options-button"]',
    placement: 'bottom',
  },
  {
    title: 'Save real lessons',
    body: 'Lessons keeps your saved materials together so they can sync to your account.',
    page: 'study',
    targetSelector: '[data-tutorial-target="lessons-button"]',
    placement: 'bottom',
  },
  {
    title: 'Open other materials',
    body: 'The magnifying glass opens shared materials from other students.',
    page: 'study',
    targetSelector: '[data-tutorial-target="search-button"]',
    placement: 'top',
  },
  {
    title: 'Search shared materials',
    body: 'Search by subject, title, or text. Try typing a topic here before moving on.',
    page: 'otherMaterials',
    targetSelector: '[data-tutorial-target="materials-search-box"]',
    placement: 'left',
  },
  {
    title: 'Use the tools',
    body: 'The toolbar has progress, AI tutor, calendar, study methods, notes, and calculator.',
    page: 'progress',
    targetSelector: '[data-tutorial-target="tool-drawer"]',
    placement: 'right',
  },
  {
    title: 'Grow your pet and XP',
    body: 'Study tasks give XP for the leaderboard and keep your streak pet warm.',
    page: 'leaderboard',
    targetSelector: '[data-tutorial-target="streak-chip"]',
    placement: 'bottom',
  },
];

const petTypes: PetType[] = ['cat', 'dragon', 'fox', 'owl'];
const eggColors: EggColor[] = ['green', 'gold', 'blue', 'red'];
const eggPetImages: Partial<Record<EggColor, string[]>> = {
  green: [
    '/pets/green/pet-1.png',
    '/pets/green/pet-2.png',
    '/pets/green/pet-3.png',
    '/pets/green/pet-4.png',
  ],
  gold: [
    '/pets/gold/bear.png',
    '/pets/gold/bunny.png',
    '/pets/gold/cat.png',
    '/pets/gold/dog.png',
  ],
  red: [
    '/pets/red/pet-1.png',
    '/pets/red/pet-2.png',
    '/pets/red/pet-3.png',
    '/pets/red/pet-4.png',
  ],
  blue: [
    '/pets/blue/pet-1.png',
    '/pets/blue/pet-2.png',
    '/pets/blue/pet-3.png',
    '/pets/blue/pet-4.png',
  ],
};

const petFaces: Record<PetType, string> = {
  cat: '=^.^=',
  dragon: '^.=.^',
  fox: '^w^',
  owl: 'o,o',
};

const eggColorLabels: Record<EggColor, string> = {
  green: 'Green',
  gold: 'Gold',
  blue: 'Blue',
  red: 'Red',
};

const modes: { id: StudyMode; labelKey: 'summaryMode' | 'flashcards' | 'quizMe' }[] = [
  { id: 'summary', labelKey: 'summaryMode' },
  { id: 'flashcards', labelKey: 'flashcards' },
  { id: 'quiz', labelKey: 'quizMe' },
];

const pagePaths: Record<Page, string> = {
  starter: '/',
  study: '/study',
  lessons: '/lessons',
  otherMaterials: '/other-materials',
  tutor: '/tutor',
  account: '/account',
  flashcards: '/flashcards',
  quiz: '/quiz',
  focusTimer: '/focus-timer',
  progress: '/progress',
  notes: '/notes',
  calculator: '/calculator',
  calendar: '/calendar',
  leaderboard: '/leaderboard',
  studyMethods: '/study-methods',
};

function getPageFromPath(pathname = window.location.pathname): Page {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  if (normalizedPath === pagePaths.lessons) return 'lessons';
  if (normalizedPath === pagePaths.otherMaterials) return 'otherMaterials';
  if (normalizedPath === pagePaths.tutor) return 'tutor';
  if (normalizedPath === pagePaths.account) return 'account';
  if (normalizedPath === pagePaths.flashcards) return 'flashcards';
  if (normalizedPath === pagePaths.quiz) return 'quiz';
  if (normalizedPath === pagePaths.focusTimer) return 'focusTimer';
  if (normalizedPath === pagePaths.progress) return 'progress';
  if (normalizedPath === pagePaths.notes) return 'notes';
  if (normalizedPath === pagePaths.calculator) return 'calculator';
  if (normalizedPath === pagePaths.calendar) return 'calendar';
  if (normalizedPath === pagePaths.leaderboard) return 'leaderboard';
  if (normalizedPath === pagePaths.studyMethods) return 'studyMethods';
  if (normalizedPath === pagePaths.study) return 'study';
  return 'starter';
}

const languageLabels: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
  kk: 'Қазақша',
};

const themeLabels: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
};

const translations = {
  en: {
    account: 'Account',
    aiTutor: 'AI Tutor',
    askTutor: 'Ask tutor',
    backToStudy: 'Back to study',
    calendar: 'Calendar',
    calculator: 'Calculator',
    checking: 'Checking...',
    createAccount: 'Create account',
    email: 'Email',
    flashcards: 'Flashcards',
    hide: 'Hide',
    language: 'Language',
    leaderboard: 'Leaderboard',
    lessonName: 'Lesson name',
    lessons: 'Lessons',
    makeFlashcards: 'Make flashcards',
    makeQuiz: 'Make quiz',
    name: 'Name',
    notes: 'Notes',
    options: 'Options',
    otherMaterials: 'Other Materials',
    password: 'Password',
    progress: 'Progress',
    quiz: 'Quiz',
    quizMe: 'Quiz me',
    saveLesson: 'Save lesson',
    show: 'Show',
    signIn: 'Sign in',
    signOut: 'Sign out',
    studyHelper: 'Study helper',
    studyHelperTitle: 'Study Helper',
    studyMaterial: 'Study material',
    studyMethods: 'Study Methods',
    studyOptions: 'Study options',
    submitAnswers: 'Submit answers',
    summarize: 'Summarize',
    summaryMode: 'Summary',
    thinking: 'Thinking...',
    yourAccount: 'Your account',
  },
  ru: {
    account: 'Аккаунт',
    aiTutor: 'ИИ-репетитор',
    askTutor: 'Спросить репетитора',
    backToStudy: 'Назад к учебе',
    calendar: 'Календарь',
    calculator: 'Калькулятор',
    checking: 'Проверяю...',
    createAccount: 'Создать аккаунт',
    email: 'Эл. почта',
    flashcards: 'Карточки',
    hide: 'Скрыть',
    language: 'Язык',
    leaderboard: 'Рейтинг',
    lessonName: 'Название урока',
    lessons: 'Уроки',
    makeFlashcards: 'Сделать карточки',
    makeQuiz: 'Сделать тест',
    name: 'Имя',
    notes: 'Заметки',
    options: 'Опции',
    otherMaterials: 'Другие материалы',
    password: 'Пароль',
    progress: 'Прогресс',
    quiz: 'Тест',
    quizMe: 'Проверь меня',
    saveLesson: 'Сохранить урок',
    show: 'Показать',
    signIn: 'Войти',
    signOut: 'Выйти',
    studyHelper: 'Помощник учебы',
    studyHelperTitle: 'Помощник учебы',
    studyMaterial: 'Учебный материал',
    studyMethods: 'Методы учебы',
    studyOptions: 'Опции учебы',
    submitAnswers: 'Отправить ответы',
    summarize: 'Сделать кратко',
    summaryMode: 'Кратко',
    thinking: 'Думаю...',
    yourAccount: 'Ваш аккаунт',
  },
  kk: {
    account: 'Аккаунт',
    aiTutor: 'AI мұғалім',
    askTutor: 'Мұғалімнен сұрау',
    backToStudy: 'Оқуға қайту',
    calendar: 'Күнтізбе',
    calculator: 'Калькулятор',
    checking: 'Тексерілуде...',
    createAccount: 'Аккаунт ашу',
    email: 'Эл. пошта',
    flashcards: 'Карточкалар',
    hide: 'Жасыру',
    language: 'Тіл',
    leaderboard: 'Рейтинг',
    lessonName: 'Сабақ атауы',
    lessons: 'Сабақтар',
    makeFlashcards: 'Карточка жасау',
    makeQuiz: 'Тест жасау',
    name: 'Аты',
    notes: 'Жазбалар',
    options: 'Опциялар',
    otherMaterials: 'Басқа материалдар',
    password: 'Құпия сөз',
    progress: 'Прогресс',
    quiz: 'Тест',
    quizMe: 'Мені тексер',
    saveLesson: 'Сабақты сақтау',
    show: 'Көрсету',
    signIn: 'Кіру',
    signOut: 'Шығу',
    studyHelper: 'Оқу көмекшісі',
    studyHelperTitle: 'Оқу көмекшісі',
    studyMaterial: 'Оқу материалы',
    studyMethods: 'Оқу әдістері',
    studyOptions: 'Оқу опциялары',
    submitAnswers: 'Жауаптарды жіберу',
    summarize: 'Қысқаша жасау',
    summaryMode: 'Қысқаша',
    thinking: 'Ойланып жатыр...',
    yourAccount: 'Сіздің аккаунтыңыз',
  },
} satisfies Record<Language, Record<string, string>>;

const fullTranslations = {
  en: {
    ...translations.en,
    accountCreated: 'Account created. You can upload materials now.',
    accountCreatedConfirm: 'Account created. Check your email if Supabase asks you to confirm it.',
    addAnotherSource: 'Add another source',
    addSource: 'Add source',
    addSubjectTitleMaterial: 'Add a subject, title, and material before uploading.',
    addYourEmailPassword: 'Add your email and password.',
    addYourNameEmailPassword: 'Add your name, email, and password.',
    answerPlaceholder: 'Type your answer...',
    askTutorPlaceholder: 'Ask about your notes, a confusing idea, or what to study next...',
    back: 'Back',
    cancel: 'Cancel',
    cardsReady: 'cards ready to review',
    correct: 'Correct',
    delete: 'Delete',
    deleteOwnOnly: 'You can only delete materials you uploaded.',
    confirmEggColor: 'Confirm egg color',
    enterAccountToUpload: 'Sign in or create an account first, then you can upload material.',
    exampleLesson: 'Example: Biology chapter 4',
    findMaterials: 'Find materials',
    front: 'Front',
    lessonDeleted: 'Lesson deleted.',
    lessonSaved: 'Lesson saved.',
    load: 'Load',
    loaded: 'Loaded',
    material: 'Material',
    materialDeleted: 'Material deleted.',
    materialPlaceholder: 'Paste the material you want to share...',
    materialUploaded: 'Material uploaded for other students.',
    nameLessonFirst: 'Name your lesson before saving.',
    noFlashcardsYet: 'No flashcards yet.',
    noQuizYet: 'No quiz yet.',
    noSavedLessonsYet: 'No saved lessons yet.',
    noSharedMaterialsFound: 'No shared materials found.',
    noSummaryReturned: 'No summary came back. Try again with a little more text.',
    notQuite: 'Not quite',
    notSubmittedYet: 'Not submitted yet',
    passwordNeeds: 'Password needs',
    passwordPlaceholder: 'Password',
    passwordRule8: 'At least 8 characters',
    passwordRuleCapital: 'Must include at least one capital letter',
    passwordRuleNumber: 'Must include numbers',
    pasteMaterialFirst: 'Paste your study material first.',
    pasteSourceFirst: 'Paste another source before adding it.',
    pasteSourcePlaceholder: 'Paste another source for this topic...',
    questionsReady: 'questions ready to answer',
    quickSummary: 'Quick summary',
    savedLessonsUsed: 'lesson slots used',
    searchPlaceholder: 'Search by subject, title, or text...',
    shareNotes: 'Share notes by subject so other students can find them.',
    petCat: 'Study Cat',
    petDragon: 'Study Dragon',
    petEgg: 'Warm Egg',
    petFriend: 'Study Pet',
    petFox: 'Study Fox',
    petHatched: 'Your egg hatched into',
    petOwl: 'Study Owl',
    petReady: 'Keep your streak alive to keep your pet happy.',
    petChooseColor: 'Choose and confirm an egg color to begin your streak.',
    petSignIn: 'Sign in to warm your egg and grow your pet.',
    petSubtitle: 'Study once each day to warm the egg.',
    petTitle: 'Streak pet',
    petWarmDays: 'warm days',
    petWarmLeft: 'more warm days to hatch',
    petWarmToday: 'Study today to warm your egg.',
    streak: 'Streak',
    signedInAs: 'Signed in as',
    signedInUpload: 'Signed in. You can upload materials now.',
    signedOut: 'Signed out.',
    signInAccountText: 'Sign in or create an account so you can upload materials.',
    signInForQuiz: 'Sign in or create an account first to make quizzes.',
    signInForSave: 'Sign in or create an account first to save lessons.',
    signInForTutor: 'Sign in or create an account first to use the AI tutor.',
    signInToUpload: 'Sign in to your account before uploading material.',
    source: 'source',
    sources: 'sources',
    subject: 'Subject',
    submitted: 'Submitted',
    title: 'Title',
    tutor: 'Tutor',
    typeTutorQuestion: 'Type a question for the tutor first.',
    typeName: 'Your name',
    uploadMaterial: 'Upload material',
    uploading: 'Uploading...',
    useMaterial: 'Use material',
    words: 'words',
    you: 'You',
  },
  ru: {
    ...translations.ru,
    accountCreated: 'Аккаунт создан. Теперь можно загружать материалы.',
    accountCreatedConfirm: 'Аккаунт создан. Проверьте почту, если Supabase попросит подтверждение.',
    addAnotherSource: 'Добавить еще источник',
    addSource: 'Добавить источник',
    addSubjectTitleMaterial: 'Добавьте предмет, название и материал перед загрузкой.',
    addYourEmailPassword: 'Добавьте email и пароль.',
    addYourNameEmailPassword: 'Добавьте имя, email и пароль.',
    answerPlaceholder: 'Введите ответ...',
    askTutorPlaceholder: 'Спросите о конспектах, сложной теме или о том, что учить дальше...',
    back: 'Обратная сторона',
    cancel: 'Отмена',
    cardsReady: 'карточек готово',
    correct: 'Верно',
    delete: 'Удалить',
    deleteOwnOnly: 'Вы можете удалять только материалы, которые загрузили сами.',
    confirmEggColor: 'Подтвердить цвет яйца',
    enterAccountToUpload: 'Сначала войдите или создайте аккаунт, потом можно загружать материалы.',
    exampleLesson: 'Например: Биология, глава 4',
    findMaterials: 'Найти материалы',
    front: 'Лицевая сторона',
    lessonDeleted: 'Урок удален.',
    lessonSaved: 'Урок сохранен.',
    load: 'Загрузить',
    loaded: 'Загружено',
    material: 'Материал',
    materialDeleted: 'Материал удален.',
    materialPlaceholder: 'Вставьте материал, которым хотите поделиться...',
    materialUploaded: 'Материал загружен для других учеников.',
    nameLessonFirst: 'Сначала назовите урок.',
    noFlashcardsYet: 'Карточек пока нет.',
    noQuizYet: 'Теста пока нет.',
    noSavedLessonsYet: 'Сохраненных уроков пока нет.',
    noSharedMaterialsFound: 'Общие материалы не найдены.',
    noSummaryReturned: 'Резюме не пришло. Попробуйте добавить немного больше текста.',
    notQuite: 'Не совсем',
    notSubmittedYet: 'Пока не отправлено',
    passwordNeeds: 'Паролю нужно',
    passwordPlaceholder: 'Пароль',
    passwordRule8: 'Минимум 8 символов',
    passwordRuleCapital: 'Хотя бы одна заглавная буква',
    passwordRuleNumber: 'Должны быть цифры',
    pasteMaterialFirst: 'Сначала вставьте учебный материал.',
    pasteSourceFirst: 'Вставьте еще один источник перед добавлением.',
    pasteSourcePlaceholder: 'Вставьте еще один источник по этой теме...',
    questionsReady: 'вопросов готово',
    quickSummary: 'Краткое резюме',
    savedLessonsUsed: 'ячеек уроков использовано',
    searchPlaceholder: 'Искать по предмету, названию или тексту...',
    shareNotes: 'Делитесь конспектами по предметам, чтобы другие ученики могли их найти.',
    petCat: 'Учебный кот',
    petDragon: 'Учебный дракон',
    petEgg: 'Теплое яйцо',
    petFriend: 'Учебный питомец',
    petFox: 'Учебная лиса',
    petHatched: 'Ваше яйцо вылупилось в',
    petOwl: 'Учебная сова',
    petReady: 'Продолжайте серию, чтобы питомец был счастлив.',
    petChooseColor: 'Выберите и подтвердите цвет яйца, чтобы начать серию.',
    petSignIn: 'Войдите, чтобы согревать яйцо и растить питомца.',
    petSubtitle: 'Учитесь один раз в день, чтобы согревать яйцо.',
    petTitle: 'Питомец серии',
    petWarmDays: 'теплых дней',
    petWarmLeft: 'теплых дней до вылупления',
    petWarmToday: 'Учитесь сегодня, чтобы согреть яйцо.',
    streak: 'Серия',
    signedInAs: 'Вы вошли как',
    signedInUpload: 'Вы вошли. Теперь можно загружать материалы.',
    signedOut: 'Вы вышли.',
    signInAccountText: 'Войдите или создайте аккаунт, чтобы загружать материалы.',
    signInForQuiz: 'Сначала войдите или создайте аккаунт, чтобы делать тесты.',
    signInForSave: 'Сначала войдите или создайте аккаунт, чтобы сохранять уроки.',
    signInForTutor: 'Сначала войдите или создайте аккаунт, чтобы использовать ИИ-репетитора.',
    signInToUpload: 'Войдите в аккаунт перед загрузкой материала.',
    source: 'источник',
    sources: 'источников',
    subject: 'Предмет',
    submitted: 'Отправлено',
    title: 'Название',
    tutor: 'Репетитор',
    typeTutorQuestion: 'Сначала введите вопрос для репетитора.',
    typeName: 'Ваше имя',
    uploadMaterial: 'Загрузить материал',
    uploading: 'Загрузка...',
    useMaterial: 'Использовать',
    words: 'слов',
    you: 'Вы',
  },
  kk: {
    ...translations.kk,
    accountCreated: 'Аккаунт ашылды. Енді материал жүктей аласыз.',
    accountCreatedConfirm: 'Аккаунт ашылды. Supabase растауды сұраса, email-ды тексеріңіз.',
    addAnotherSource: 'Тағы дереккөз қосу',
    addSource: 'Дереккөз қосу',
    addSubjectTitleMaterial: 'Жүктеу алдында пән, атау және материал қосыңыз.',
    addYourEmailPassword: 'Email және құпия сөз қосыңыз.',
    addYourNameEmailPassword: 'Атыңызды, email және құпия сөз қосыңыз.',
    answerPlaceholder: 'Жауабыңызды жазыңыз...',
    askTutorPlaceholder: 'Жазбаларыңыз, түсініксіз тақырып немесе келесі қадам туралы сұраңыз...',
    back: 'Артқы бет',
    cancel: 'Болдырмау',
    cardsReady: 'карточка дайын',
    correct: 'Дұрыс',
    delete: 'Жою',
    deleteOwnOnly: 'Сіз тек өзіңіз жүктеген материалдарды жоя аласыз.',
    confirmEggColor: 'Жұмыртқа түсін растау',
    enterAccountToUpload: 'Алдымен кіріңіз немесе аккаунт ашыңыз, содан кейін материал жүктей аласыз.',
    exampleLesson: 'Мысалы: Биология, 4-тарау',
    findMaterials: 'Материал іздеу',
    front: 'Алдыңғы бет',
    lessonDeleted: 'Сабақ жойылды.',
    lessonSaved: 'Сабақ сақталды.',
    load: 'Жүктеу',
    loaded: 'Жүктелді',
    material: 'Материал',
    materialDeleted: 'Материал жойылды.',
    materialPlaceholder: 'Бөліскіңіз келетін материалды қойыңыз...',
    materialUploaded: 'Материал басқа оқушыларға жүктелді.',
    nameLessonFirst: 'Сақтау алдында сабаққа ат қойыңыз.',
    noFlashcardsYet: 'Әзірге карточка жоқ.',
    noQuizYet: 'Әзірге тест жоқ.',
    noSavedLessonsYet: 'Әзірге сақталған сабақ жоқ.',
    noSharedMaterialsFound: 'Ортақ материалдар табылмады.',
    noSummaryReturned: 'Қысқаша жауап келмеді. Көбірек мәтін қосып көріңіз.',
    notQuite: 'Әлі де дәл емес',
    notSubmittedYet: 'Әлі жіберілмеді',
    passwordNeeds: 'Құпия сөзге қажет',
    passwordPlaceholder: 'Құпия сөз',
    passwordRule8: 'Кемінде 8 таңба',
    passwordRuleCapital: 'Кемінде бір үлкен әріп',
    passwordRuleNumber: 'Сан болуы керек',
    pasteMaterialFirst: 'Алдымен оқу материалын қойыңыз.',
    pasteSourceFirst: 'Қосу алдында тағы дереккөз қойыңыз.',
    pasteSourcePlaceholder: 'Осы тақырыпқа тағы дереккөз қойыңыз...',
    questionsReady: 'сұрақ дайын',
    quickSummary: 'Қысқаша мазмұн',
    savedLessonsUsed: 'сабақ орны қолданылды',
    searchPlaceholder: 'Пән, атау немесе мәтін бойынша іздеу...',
    shareNotes: 'Басқа оқушылар табуы үшін конспекттерді пән бойынша бөлісіңіз.',
    petCat: 'Оқу мысығы',
    petDragon: 'Оқу айдаһары',
    petEgg: 'Жылы жұмыртқа',
    petFriend: 'Оқу жануары',
    petFox: 'Оқу түлкісі',
    petHatched: 'Жұмыртқаңыз мынаған айналды',
    petOwl: 'Оқу үкісі',
    petReady: 'Үй жануарыңыз қуанышты болу үшін серияны жалғастырыңыз.',
    petChooseColor: 'Серияны бастау үшін жұмыртқа түсін таңдап, растаңыз.',
    petSignIn: 'Жұмыртқаны жылытып, үй жануарын өсіру үшін кіріңіз.',
    petSubtitle: 'Жұмыртқаны жылыту үшін күн сайын бір рет оқыңыз.',
    petTitle: 'Серия үй жануары',
    petWarmDays: 'жылы күн',
    petWarmLeft: 'жылы күннен кейін шығады',
    petWarmToday: 'Жұмыртқаны жылыту үшін бүгін оқыңыз.',
    streak: 'Серия',
    signedInAs: 'Кірген аккаунт',
    signedInUpload: 'Кірдіңіз. Енді материал жүктей аласыз.',
    signedOut: 'Шықтыңыз.',
    signInAccountText: 'Материал жүктеу үшін кіріңіз немесе аккаунт ашыңыз.',
    signInForQuiz: 'Тест жасау үшін алдымен кіріңіз немесе аккаунт ашыңыз.',
    signInForSave: 'Сабақ сақтау үшін алдымен кіріңіз немесе аккаунт ашыңыз.',
    signInForTutor: 'AI мұғалімді қолдану үшін алдымен кіріңіз немесе аккаунт ашыңыз.',
    signInToUpload: 'Материал жүктеу алдында аккаунтқа кіріңіз.',
    source: 'дереккөз',
    sources: 'дереккөз',
    subject: 'Пән',
    submitted: 'Жіберілді',
    title: 'Атау',
    tutor: 'Мұғалім',
    typeTutorQuestion: 'Алдымен мұғалімге сұрақ жазыңыз.',
    typeName: 'Атыңыз',
    uploadMaterial: 'Материал жүктеу',
    uploading: 'Жүктелуде...',
    useMaterial: 'Қолдану',
    words: 'сөз',
    you: 'Сіз',
  },
} satisfies Record<Language, Record<string, string>>;

function getButtonLabel(mode: StudyMode, isLoading: boolean, copy: typeof fullTranslations.en) {
  if (isLoading) return copy.thinking;
  if (mode === 'flashcards') return copy.makeFlashcards;
  if (mode === 'quiz') return copy.makeQuiz;
  return copy.summarize;
}

function readLanguage(): Language {
  const savedLanguage = window.localStorage.getItem(languageKey);
  return savedLanguage === 'ru' || savedLanguage === 'kk' ? savedLanguage : 'en';
}

function readTheme(): Theme {
  return window.localStorage.getItem(themeKey) === 'dark' ? 'dark' : 'light';
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function getCalendarDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCalendarDateKeyFromValue(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return getCalendarDateKey(date);
}

function getCalendarMonthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function addDaysToDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return getCalendarDateKey(date);
}

function getStudyPetKey(userId?: string) {
  return userId ? `${studyPetKey}:${userId}` : studyPetKey;
}

function getSavedLessonsKey(userId?: string) {
  return userId ? `${savedLessonsKey}:${userId}` : savedLessonsKey;
}

function getSavedNotesKey(userId?: string) {
  return userId ? `${savedNotesKey}:${userId}` : savedNotesKey;
}

function getKnowledgeStatsKey(userId?: string) {
  return userId ? `${knowledgeStatsKey}:${userId}` : knowledgeStatsKey;
}

function getIntervalingPlansKey(userId?: string) {
  return userId ? `${intervalingPlansKey}:${userId}` : intervalingPlansKey;
}

function getCustomCalendarEventsKey(userId?: string) {
  return userId ? `${customCalendarEventsKey}:${userId}` : customCalendarEventsKey;
}

function getLearningXpKey(userId?: string) {
  return userId ? `${learningXpKey}:${userId}` : learningXpKey;
}

function getTutorialSeenKey(userId?: string) {
  return userId ? `${tutorialSeenKey}:${userId}` : tutorialSeenKey;
}

function hasAnsweredTutorialPrompt(userId?: string) {
  return window.localStorage.getItem(getTutorialSeenKey(userId)) === 'done';
}

function markTutorialPromptAnswered(userId?: string) {
  window.localStorage.setItem(getTutorialSeenKey(userId), 'done');
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTutorialPopoverStyle(rect: TutorialTargetRect | null, placement: TutorialStep['placement']): CSSProperties {
  if (typeof window === 'undefined') return {};

  const gap = 22;
  const edge = 14;
  const width = Math.min(340, window.innerWidth - edge * 2);
  const height = 216;
  const fallback: CSSProperties = {
    bottom: 86,
    left: edge,
    width,
  };

  if (!rect) return fallback;

  if (placement === 'left' || placement === 'right') {
    const left =
      placement === 'right'
        ? clampNumber(rect.left + rect.width + gap, edge, window.innerWidth - width - edge)
        : clampNumber(rect.left - width - gap, edge, window.innerWidth - width - edge);

    return {
      top: clampNumber(rect.top + rect.height / 2 - height / 2, edge, window.innerHeight - height - edge),
      left,
      width,
    };
  }

  const left = clampNumber(rect.left + rect.width / 2 - width / 2, edge, window.innerWidth - width - edge);
  const top =
    placement === 'top'
      ? Math.max(edge, rect.top - height - gap)
      : Math.min(window.innerHeight - height - edge, rect.top + rect.height + gap);

  return {
    top,
    left,
    width,
  };
}

function getTutorialArrowStyle(rect: TutorialTargetRect | null, placement: TutorialStep['placement']): CSSProperties {
  if (!rect) return {};

  const arrowSize = 62;
  const targetCenterX = rect.left + rect.width / 2;
  const targetCenterY = rect.top + rect.height / 2;

  if (placement === 'top') {
    return {
      top: Math.max(12, rect.top - arrowSize - 4),
      left: targetCenterX - arrowSize / 2,
      transform: 'rotate(90deg)',
    };
  }

  if (placement === 'bottom') {
    return {
      top: rect.top + rect.height + 4,
      left: targetCenterX - arrowSize / 2,
      transform: 'rotate(-90deg)',
    };
  }

  if (placement === 'right') {
    return {
      top: targetCenterY - arrowSize / 2,
      left: rect.left + rect.width + 6,
      transform: 'rotate(180deg)',
    };
  }

  return {
    top: targetCenterY - arrowSize / 2,
    left: Math.max(8, rect.left - arrowSize - 6),
  };
}

function getLearningTaskKey(taskId: LearningTaskId, dateKey = getTodayKey()) {
  return `${dateKey}:${taskId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeSavedLessons(value: unknown): SavedLesson[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((lesson) => {
      const material = typeof lesson.material === 'string' ? lesson.material : '';
      const sources = Array.isArray(lesson.sources)
        ? lesson.sources.filter((source): source is string => typeof source === 'string' && source.trim().length > 0)
        : material
          ? [material]
          : [];

      return {
        id: typeof lesson.id === 'string' && lesson.id ? lesson.id : crypto.randomUUID(),
        title: typeof lesson.title === 'string' && lesson.title.trim() ? lesson.title.slice(0, 60) : 'Untitled lesson',
        material: material || sources.join('\n\n'),
        sources,
        savedAt: typeof lesson.savedAt === 'string' && lesson.savedAt ? lesson.savedAt : new Date().toISOString(),
      };
    })
    .filter((lesson) => lesson.material.trim().length > 0)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    .slice(0, maxSavedLessons);
}

function normalizeSavedNotes(value: unknown): StudyNote[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((note) => ({
      id: typeof note.id === 'string' && note.id ? note.id : crypto.randomUUID(),
      title: typeof note.title === 'string' && note.title.trim() ? note.title.slice(0, 70) : 'Untitled note',
      body: typeof note.body === 'string' ? note.body : '',
      imageData: typeof note.imageData === 'string' ? note.imageData : '',
      updatedAt: typeof note.updatedAt === 'string' && note.updatedAt ? note.updatedAt : new Date().toISOString(),
    }))
    .filter((note) => Boolean(note.imageData || note.body))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, maxSavedNotes);
}

function normalizeStudyPet(value: unknown): StudyPet {
  if (!isRecord(value)) return emptyStudyPet;

  return {
    streak: Math.max(0, Math.round(toFiniteNumber(value.streak))),
    lastStudyDate: typeof value.lastStudyDate === 'string' ? value.lastStudyDate : '',
    petType: petTypes.includes(value.petType as PetType) ? value.petType as PetType : null,
    petImage: typeof value.petImage === 'string' && value.petImage ? value.petImage : null,
    eggColor: eggColors.includes(value.eggColor as EggColor) ? value.eggColor as EggColor : 'green',
    hasChosenEggColor: Boolean(value.hasChosenEggColor),
  };
}

function normalizeKnowledgeStats(value: unknown): KnowledgeAreaStat[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((stat) => ({
      area: typeof stat.area === 'string' && stat.area.trim() ? stat.area.slice(0, 48) : 'General',
      attempts: Math.max(0, Math.round(toFiniteNumber(stat.attempts))),
      correct: Math.max(0, Math.round(toFiniteNumber(stat.correct))),
      mistakes: Math.max(0, Math.round(toFiniteNumber(stat.mistakes))),
      lastPracticed: typeof stat.lastPracticed === 'string' && stat.lastPracticed ? stat.lastPracticed : new Date().toISOString(),
    }))
    .filter((stat) => stat.attempts > 0 || stat.correct > 0 || stat.mistakes > 0)
    .slice(0, 30);
}

function normalizeIntervalingPlans(value: unknown): IntervalingPlan[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((plan) => ({
      id: typeof plan.id === 'string' && plan.id ? plan.id : crypto.randomUUID(),
      title: typeof plan.title === 'string' && plan.title.trim() ? plan.title.slice(0, 70) : 'Intervaling review',
      startDate: typeof plan.startDate === 'string' && getCalendarDateKeyFromValue(plan.startDate)
        ? getCalendarDateKeyFromValue(plan.startDate)
        : getTodayKey(),
      createdAt: typeof plan.createdAt === 'string' && plan.createdAt ? plan.createdAt : new Date().toISOString(),
    }))
    .slice(0, maxIntervalingPlans);
}

function normalizeCustomCalendarEvents(value: unknown): CustomCalendarEvent[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((event) => ({
      id: typeof event.id === 'string' && event.id ? event.id : crypto.randomUUID(),
      title: typeof event.title === 'string' && event.title.trim() ? event.title.slice(0, 80) : '',
      dateKey: typeof event.dateKey === 'string' ? getCalendarDateKeyFromValue(event.dateKey) : '',
      note: typeof event.note === 'string' ? event.note : '',
      createdAt: typeof event.createdAt === 'string' && event.createdAt ? event.createdAt : new Date().toISOString(),
    }))
    .filter((event) => event.title && event.dateKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(0, maxCustomCalendarEvents);
}

function normalizeLearningXp(value: unknown): LearningXpState {
  if (!isRecord(value)) return emptyLearningXp;

  const completedTaskKeys = Array.isArray(value.completedTaskKeys)
    ? value.completedTaskKeys.filter((taskKey): taskKey is string => typeof taskKey === 'string')
    : [];
  const totalXp = Math.max(0, Math.round(toFiniteNumber(value.totalXp)));
  const taskXpFromKeys = getLearningXpFromTaskKeys(completedTaskKeys);

  return {
    totalXp: Math.max(totalXp, taskXpFromKeys),
    completedTaskKeys: Array.from(new Set(completedTaskKeys)).slice(0, 600),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
  };
}

function getLearningXpFromTaskKeys(taskKeys: string[]) {
  return taskKeys.reduce((total, taskKey) => {
    const taskId = taskKey.split(':').pop() as LearningTaskId | undefined;
    const task = learningTaskDefinitions.find((item) => item.id === taskId);
    return total + (task?.xp ?? 0);
  }, 0);
}

function getDateTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function readStudyPet(userId?: string): StudyPet {
  try {
    if (!userId) return emptyStudyPet;

    const rawPet = window.localStorage.getItem(getStudyPetKey(userId));
    if (!rawPet) return emptyStudyPet;
    return normalizeStudyPet(JSON.parse(rawPet));
  } catch {
    return emptyStudyPet;
  }
}

function getPetName(petType: PetType | null, petImage: string | null, copy: typeof fullTranslations.en) {
  if (petImage) return copy.petFriend;
  if (petType === 'cat') return copy.petCat;
  if (petType === 'dragon') return copy.petDragon;
  if (petType === 'fox') return copy.petFox;
  if (petType === 'owl') return copy.petOwl;
  return copy.petEgg;
}

function getPetFace(petType: PetType | null) {
  return petType ? petFaces[petType] : '()';
}

function getRandomEggPetImage(eggColor: EggColor) {
  const petImagesForEgg = eggPetImages[eggColor] ?? [];
  if (petImagesForEgg.length === 0) return null;
  return petImagesForEgg[Math.floor(Math.random() * petImagesForEgg.length)];
}

function getGoogleSignInLabel(language: Language) {
  if (language === 'ru') return 'Войти через Google';
  if (language === 'kk') return 'Google арқылы кіру';
  return 'Sign in with Google';
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

function normalizeBlurtingCategory(category: string): BlurtingHighlightCategory {
  if (category === 'wrong') return 'wrong';
  if (category === 'needsWork') return 'needsWork';
  return 'good';
}

function getBlurtingCategoryClass(category: BlurtingHighlightCategory) {
  return category === 'needsWork' ? 'needs-work' : category;
}

function getBlurtingHighlightSegments(text: string, highlights: BlurtingHighlight[]) {
  const matchedHighlights: { start: number; end: number; category: BlurtingHighlightCategory; note?: string }[] = [];
  const lowerText = text.toLowerCase();

  highlights.forEach((highlight) => {
    const quote = highlight.quote?.trim();
    if (!quote) return;

    const start = lowerText.indexOf(quote.toLowerCase());
    const end = start + quote.length;
    const overlaps = matchedHighlights.some((item) => start < item.end && end > item.start);

    if (start >= 0 && !overlaps) {
      matchedHighlights.push({
        start,
        end,
        category: normalizeBlurtingCategory(highlight.category),
        note: highlight.note,
      });
    }
  });

  matchedHighlights.sort((a, b) => a.start - b.start);

  const segments: { text: string; category?: BlurtingHighlightCategory; note?: string }[] = [];
  let cursor = 0;

  matchedHighlights.forEach((highlight) => {
    if (highlight.start > cursor) {
      segments.push({ text: text.slice(cursor, highlight.start) });
    }

    segments.push({
      text: text.slice(highlight.start, highlight.end),
      category: highlight.category,
      note: highlight.note,
    });
    cursor = highlight.end;
  });

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments.length ? segments : [{ text }];
}

function getLessonKnowledgePercent(lesson: SavedLesson) {
  const sourceCount = getLessonSources(lesson).length;
  const wordCount = getWordCount(getLessonMaterial(lesson));
  const sourceProgress = Math.min(sourceCount * 18, 54);
  const wordProgress = Math.min(Math.floor(wordCount / 70) * 6, 36);
  return Math.min(10 + sourceProgress + wordProgress, 100);
}

function getWeakestLesson(lessons: SavedLesson[]) {
  if (lessons.length === 0) return null;
  return lessons.reduce((weakest, lesson) =>
    getLessonKnowledgePercent(lesson) < getLessonKnowledgePercent(weakest) ? lesson : weakest,
  );
}

function getStudyKeywords(text: string) {
  const skipWords = new Set([
    'about',
    'after',
    'again',
    'because',
    'before',
    'could',
    'every',
    'first',
    'learn',
    'other',
    'should',
    'their',
    'there',
    'these',
    'thing',
    'which',
    'would',
  ]);

  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 4 && !skipWords.has(word)),
    ),
  ).slice(0, 8);
}

function normalizeQuizArea(area: string | undefined, question: string) {
  const cleanedArea = area?.replace(/\s+/g, ' ').trim();
  if (cleanedArea) return cleanedArea.slice(0, 48);
  return getStudyKeywords(question)[0] || 'General';
}

function readKnowledgeStats(userId?: string) {
  try {
    const rawStats = window.localStorage.getItem(getKnowledgeStatsKey(userId));
    if (!rawStats) return [];
    return normalizeKnowledgeStats(JSON.parse(rawStats));
  } catch {
    return [];
  }
}

function formatKnowledgeStatsForAi(stats: KnowledgeAreaStat[]) {
  if (!stats.length) return 'No quiz performance data yet.';

  return stats
    .slice(0, 8)
    .map((stat) => {
      const accuracy = stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : 0;
      return `${stat.area}: ${stat.correct}/${stat.attempts} correct, ${stat.mistakes} mistakes, ${accuracy}% accuracy`;
    })
    .join('\n');
}

function formatTimerTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function clampTimerMinutes(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(180, Math.max(1, Math.round(value)));
}

function detectQuizKeyboardLanguage(text: string) {
  const scriptChecks = [
    { languageName: 'Russian/Kazakh Cyrillic', pattern: /[\u0400-\u052f]/ },
    { languageName: 'Greek', pattern: /[\u0370-\u03ff]/ },
    { languageName: 'Arabic', pattern: /[\u0600-\u06ff]/ },
    { languageName: 'Hebrew', pattern: /[\u0590-\u05ff]/ },
    { languageName: 'Chinese/Japanese/Korean', pattern: /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/ },
    { languageName: 'Hindi/Devanagari', pattern: /[\u0900-\u097f]/ },
    { languageName: 'Thai', pattern: /[\u0e00-\u0e7f]/ },
  ];

  const scriptMatch = scriptChecks.find((check) => check.pattern.test(text));
  if (scriptMatch) return scriptMatch.languageName;

  const accentedLatinLetters = text.match(/[\u00c0-\u024f]/g);
  if (accentedLatinLetters && accentedLatinLetters.length >= 3) {
    return 'a language with accented letters';
  }

  return '';
}

function readSavedLessons(userId?: string) {
  try {
    const rawLessons = window.localStorage.getItem(getSavedLessonsKey(userId)) ?? (userId ? window.localStorage.getItem(savedLessonsKey) : null);
    if (!rawLessons) return [];
    return normalizeSavedLessons(JSON.parse(rawLessons));
  } catch {
    return [];
  }
}

function readSavedNotes(userId?: string) {
  try {
    const rawNotes = window.localStorage.getItem(getSavedNotesKey(userId)) ?? (userId ? window.localStorage.getItem(savedNotesKey) : null);
    if (!rawNotes) return [];
    return normalizeSavedNotes(JSON.parse(rawNotes));
  } catch {
    return [];
  }
}

function readIntervalingPlans(userId?: string) {
  try {
    const rawPlans = window.localStorage.getItem(getIntervalingPlansKey(userId));
    if (!rawPlans) return [];
    return normalizeIntervalingPlans(JSON.parse(rawPlans));
  } catch {
    return [];
  }
}

function readCustomCalendarEvents(userId?: string) {
  try {
    const rawEvents = window.localStorage.getItem(getCustomCalendarEventsKey(userId));
    if (!rawEvents) return [];
    return normalizeCustomCalendarEvents(JSON.parse(rawEvents));
  } catch {
    return [];
  }
}

function readLearningXp(userId?: string): LearningXpState {
  try {
    if (!userId) return emptyLearningXp;

    const rawXp = window.localStorage.getItem(getLearningXpKey(userId));
    if (!rawXp) return emptyLearningXp;
    return normalizeLearningXp(JSON.parse(rawXp));
  } catch {
    return emptyLearningXp;
  }
}

function getLocalUserAppState(userId?: string): UserAppState {
  return {
    savedLessons: readSavedLessons(userId),
    savedNotes: readSavedNotes(userId),
    studyPet: readStudyPet(userId),
    knowledgeStats: readKnowledgeStats(userId),
    intervalingPlans: readIntervalingPlans(userId),
    customCalendarEvents: readCustomCalendarEvents(userId),
    learningXp: readLearningXp(userId),
  };
}

function persistUserAppStateLocally(userId: string | undefined, state: UserAppState) {
  window.localStorage.setItem(getSavedLessonsKey(userId), JSON.stringify(state.savedLessons));
  window.localStorage.setItem(getSavedNotesKey(userId), JSON.stringify(state.savedNotes));
  if (userId) {
    window.localStorage.setItem(getStudyPetKey(userId), JSON.stringify(state.studyPet));
    window.localStorage.setItem(getKnowledgeStatsKey(userId), JSON.stringify(state.knowledgeStats));
    window.localStorage.setItem(getIntervalingPlansKey(userId), JSON.stringify(state.intervalingPlans));
    window.localStorage.setItem(getCustomCalendarEventsKey(userId), JSON.stringify(state.customCalendarEvents));
    window.localStorage.setItem(getLearningXpKey(userId), JSON.stringify(state.learningXp));
  }
}

function normalizeUserAppStateRow(row: UserAppStateRow): UserAppState {
  return {
    savedLessons: normalizeSavedLessons(row.saved_lessons),
    savedNotes: normalizeSavedNotes(row.saved_notes),
    studyPet: normalizeStudyPet(row.study_pet),
    knowledgeStats: normalizeKnowledgeStats(row.knowledge_stats),
    intervalingPlans: normalizeIntervalingPlans(row.intervaling_plans),
    customCalendarEvents: normalizeCustomCalendarEvents(row.custom_calendar_events),
    learningXp: normalizeLearningXp(row.learning_xp),
  };
}

function hasUserAppStateContent(state: UserAppState) {
  return (
    state.savedLessons.length > 0 ||
    state.savedNotes.length > 0 ||
    state.knowledgeStats.length > 0 ||
    state.intervalingPlans.length > 0 ||
    state.customCalendarEvents.length > 0 ||
    state.learningXp.totalXp > 0 ||
    state.learningXp.completedTaskKeys.length > 0 ||
    state.studyPet.streak > 0 ||
    state.studyPet.hasChosenEggColor ||
    Boolean(state.studyPet.petImage || state.studyPet.petType)
  );
}

function mergeSavedLessons(remoteLessons: SavedLesson[], localLessons: SavedLesson[]) {
  const lessonsById = new Map<string, SavedLesson>();
  [...remoteLessons, ...localLessons].forEach((lesson) => {
    const existing = lessonsById.get(lesson.id);
    if (!existing || getDateTime(lesson.savedAt) >= getDateTime(existing.savedAt)) {
      lessonsById.set(lesson.id, lesson);
    }
  });

  return Array.from(lessonsById.values())
    .sort((a, b) => getDateTime(b.savedAt) - getDateTime(a.savedAt))
    .slice(0, maxSavedLessons);
}

function mergeSavedNotes(remoteNotes: StudyNote[], localNotes: StudyNote[]) {
  const notesById = new Map<string, StudyNote>();
  [...remoteNotes, ...localNotes].forEach((note) => {
    const existing = notesById.get(note.id);
    if (!existing || getDateTime(note.updatedAt) >= getDateTime(existing.updatedAt)) {
      notesById.set(note.id, note);
    }
  });

  return Array.from(notesById.values())
    .sort((a, b) => getDateTime(b.updatedAt) - getDateTime(a.updatedAt))
    .slice(0, maxSavedNotes);
}

function getStudyPetScore(pet: StudyPet) {
  const lastStudyScore = pet.lastStudyDate ? getDateTime(`${pet.lastStudyDate}T00:00:00`) / 100000000000 : 0;
  return (
    (pet.hasChosenEggColor ? 20 : 0) +
    (pet.petImage || pet.petType ? 40 : 0) +
    pet.streak * 8 +
    lastStudyScore
  );
}

function mergeStudyPet(remotePet: StudyPet, localPet: StudyPet) {
  return getStudyPetScore(localPet) > getStudyPetScore(remotePet) ? localPet : remotePet;
}

function mergeKnowledgeStats(remoteStats: KnowledgeAreaStat[], localStats: KnowledgeAreaStat[]) {
  const statsByArea = new Map<string, KnowledgeAreaStat>();
  [...remoteStats, ...localStats].forEach((stat) => {
    const key = stat.area.toLowerCase();
    const existing = statsByArea.get(key);
    if (!existing) {
      statsByArea.set(key, stat);
      return;
    }

    statsByArea.set(key, {
      area: existing.area,
      attempts: Math.max(existing.attempts, stat.attempts),
      correct: Math.max(existing.correct, stat.correct),
      mistakes: Math.max(existing.mistakes, stat.mistakes),
      lastPracticed: getDateTime(stat.lastPracticed) > getDateTime(existing.lastPracticed) ? stat.lastPracticed : existing.lastPracticed,
    });
  });

  return Array.from(statsByArea.values())
    .sort((a, b) => b.mistakes - a.mistakes || b.attempts - a.attempts)
    .slice(0, 30);
}

function mergeByIdAndDate<T extends { id: string }>(
  remoteItems: T[],
  localItems: T[],
  getItemDate: (item: T) => string,
  maxItems: number,
) {
  const itemsById = new Map<string, T>();
  [...remoteItems, ...localItems].forEach((item) => {
    const existing = itemsById.get(item.id);
    if (!existing || getDateTime(getItemDate(item)) >= getDateTime(getItemDate(existing))) {
      itemsById.set(item.id, item);
    }
  });

  return Array.from(itemsById.values())
    .sort((a, b) => getDateTime(getItemDate(b)) - getDateTime(getItemDate(a)))
    .slice(0, maxItems);
}

function mergeLearningXp(remoteXp: LearningXpState, localXp: LearningXpState) {
  const completedTaskKeys = Array.from(new Set([...remoteXp.completedTaskKeys, ...localXp.completedTaskKeys])).slice(0, 600);
  const taskXp = getLearningXpFromTaskKeys(completedTaskKeys);

  return {
    totalXp: Math.max(remoteXp.totalXp, localXp.totalXp, taskXp),
    completedTaskKeys,
    updatedAt: getDateTime(localXp.updatedAt) > getDateTime(remoteXp.updatedAt) ? localXp.updatedAt : remoteXp.updatedAt,
  };
}

function mergeUserAppState(remoteState: UserAppState, localState: UserAppState): UserAppState {
  return {
    savedLessons: mergeSavedLessons(remoteState.savedLessons, localState.savedLessons),
    savedNotes: mergeSavedNotes(remoteState.savedNotes, localState.savedNotes),
    studyPet: mergeStudyPet(remoteState.studyPet, localState.studyPet),
    knowledgeStats: mergeKnowledgeStats(remoteState.knowledgeStats, localState.knowledgeStats),
    intervalingPlans: mergeByIdAndDate(
      remoteState.intervalingPlans,
      localState.intervalingPlans,
      (plan) => plan.createdAt,
      maxIntervalingPlans,
    ),
    customCalendarEvents: mergeByIdAndDate(
      remoteState.customCalendarEvents,
      localState.customCalendarEvents,
      (event) => event.createdAt,
      maxCustomCalendarEvents,
    ).sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    learningXp: mergeLearningXp(remoteState.learningXp, localState.learningXp),
  };
}

function getIntervalingPlanEvents(plan: IntervalingPlan): CalendarEvent[] {
  const schedule = [
    { offset: 0, label: 'Intervaling', detail: 'Day 1: 60 minute first review' },
    { offset: 2, label: 'Intervaling', detail: 'Day 3: 30 minute full review' },
    { offset: 4, label: 'Intervaling', detail: 'Day 5: 10-15 minute weak-parts review' },
    { offset: 6, label: 'Intervaling', detail: 'Day 7: 10-15 minute weak-parts review' },
    { offset: 8, label: 'Intervaling', detail: 'Day 9: 10-15 minute weak-parts review' },
    { offset: 10, label: 'Intervaling', detail: 'Day 11: 10-15 minute weak-parts review' },
    { offset: 12, label: 'Intervaling', detail: 'Day 13: 10-15 minute weak-parts review' },
  ];

  return schedule.map((item) => ({
    dateKey: addDaysToDateKey(plan.startDate, item.offset),
    label: item.label,
    detail: `${plan.title}: ${item.detail}`,
    type: 'intervaling',
    planId: plan.id,
  }));
}

export default function App() {
  const [page, setPage] = useState<Page>(() => getPageFromPath());
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>(() => readTheme());
  const [mode, setMode] = useState<StudyMode>('summary');
  const [lessonName, setLessonName] = useState('');
  const [material, setMaterial] = useState('');
  const [savedLessons, setSavedLessons] = useState<SavedLesson[]>([]);
  const [savedNotes, setSavedNotes] = useState<StudyNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteImageData, setNoteImageData] = useState('');
  const [noteFallbackText, setNoteFallbackText] = useState('');
  const [notePenColor, setNotePenColor] = useState(() => (readTheme() === 'dark' ? '#f7f8f8' : '#142126'));
  const [notePenSize, setNotePenSize] = useState(7);
  const [isNoteDirty, setIsNoteDirty] = useState(false);
  const [isSavedNotesOpen, setIsSavedNotesOpen] = useState(false);
  const [notesNotice, setNotesNotice] = useState('');
  const [notesError, setNotesError] = useState('');
  const [summary, setSummary] = useState('');
  const [isSummaryCopied, setIsSummaryCopied] = useState(false);
  const [studyPet, setStudyPet] = useState<StudyPet>(emptyStudyPet);
  const [pendingEggColor, setPendingEggColor] = useState<EggColor>('green');
  const [hatchPopup, setHatchPopup] = useState<HatchPopup | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizGrades, setQuizGrades] = useState<QuizGrade[]>([]);
  const [showQuizAnswers, setShowQuizAnswers] = useState(false);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [isQuizChecking, setIsQuizChecking] = useState(false);
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [quizError, setQuizError] = useState('');
  const [quizKeyboardCheck, setQuizKeyboardCheck] = useState<QuizKeyboardCheck | null>(null);
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeAreaStat[]>([]);
  const [timerMode, setTimerMode] = useState<TimerMode>('focus');
  const [focusMinutes, setFocusMinutes] = useState(defaultFocusMinutes);
  const [breakMinutes, setBreakMinutes] = useState(defaultBreakMinutes);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(defaultFocusMinutes * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [calculatorDisplay, setCalculatorDisplay] = useState('0');
  const [calculatorStoredValue, setCalculatorStoredValue] = useState<number | null>(null);
  const [calculatorOperator, setCalculatorOperator] = useState<CalculatorOperator | null>(null);
  const [isCalculatorWaiting, setIsCalculatorWaiting] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => getCalendarDateKey(new Date()));
  const [intervalingPlans, setIntervalingPlans] = useState<IntervalingPlan[]>([]);
  const [customCalendarEvents, setCustomCalendarEvents] = useState<CustomCalendarEvent[]>([]);
  const [isCalendarEventFormOpen, setIsCalendarEventFormOpen] = useState(false);
  const [calendarEventTitle, setCalendarEventTitle] = useState('');
  const [calendarEventDate, setCalendarEventDate] = useState(() => getCalendarDateKey(new Date()));
  const [calendarEventNote, setCalendarEventNote] = useState('');
  const [calendarEventError, setCalendarEventError] = useState('');
  const [isPomodoroInfoOpen, setIsPomodoroInfoOpen] = useState(false);
  const [isPomodoroSetupOpen, setIsPomodoroSetupOpen] = useState(false);
  const [pomodoroStudyMinutes, setPomodoroStudyMinutes] = useState('120');
  const [isTeachInfoOpen, setIsTeachInfoOpen] = useState(false);
  const [isIntervalingInfoOpen, setIsIntervalingInfoOpen] = useState(false);
  const [isBlurtingInfoOpen, setIsBlurtingInfoOpen] = useState(false);
  const [isBlurtingPracticeOpen, setIsBlurtingPracticeOpen] = useState(false);
  const [blurtingNotes, setBlurtingNotes] = useState('');
  const [blurtingReview, setBlurtingReview] = useState<BlurtingReview | null>(null);
  const [blurtingError, setBlurtingError] = useState('');
  const [isBlurtingChecking, setIsBlurtingChecking] = useState(false);
  const [isTeachChatOpen, setIsTeachChatOpen] = useState(false);
  const [teachMessages, setTeachMessages] = useState<TeachMessage[]>([]);
  const [teachAnswer, setTeachAnswer] = useState('');
  const [teachLessonId, setTeachLessonId] = useState<string | null>(null);
  const [isTeachPetThinking, setIsTeachPetThinking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(true);
  const [isToolDrawerOpen, setIsToolDrawerOpen] = useState(true);
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
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardProfile[]>([]);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [learningXp, setLearningXp] = useState<LearningXpState>(emptyLearningXp);
  const [session, setSession] = useState<Session | null>(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(!isSupabaseConfigured);
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [accountNameInput, setAccountNameInput] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountNotice, setAccountNotice] = useState('');
  const [tutorialUserId, setTutorialUserId] = useState<string | null>(null);
  const [isTutorialPromptOpen, setIsTutorialPromptOpen] = useState(false);
  const [isTutorialTourOpen, setIsTutorialTourOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialTargetRect, setTutorialTargetRect] = useState<TutorialTargetRect | null>(null);
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
  const noteCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isNoteDrawingRef = useRef(false);
  const lastNotePointRef = useRef<{ x: number; y: number } | null>(null);
  const hatchTimerRef = useRef<number | null>(null);
  const summaryCopyTimerRef = useRef<number | null>(null);
  const accountStateLoadedUserRef = useRef<string | null>(null);
  const accountStateSaveTimerRef = useRef<number | null>(null);

  const searchedSharedMaterials = sharedMaterials.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return `${item.subject} ${item.title} ${item.material}`.toLowerCase().includes(query);
  });
  const copy = fullTranslations[language];
  const currentAccountName = session?.user.user_metadata.display_name || session?.user.email || '';
  const currentLeaderboardName = session?.user.user_metadata.display_name || session?.user.email?.split('@')[0] || 'Student';
  const currentLeaderboardRank = session
    ? leaderboardRows.findIndex((row) => row.user_id === session.user.id) + 1
    : 0;
  const todayTaskKeyPrefix = `${getTodayKey()}:`;
  const todayCompletedTaskKeys = learningXp.completedTaskKeys.filter((taskKey) => taskKey.startsWith(todayTaskKeyPrefix));
  const completedTaskKeySet = new Set(learningXp.completedTaskKeys);
  const todayCompletedTaskSet = new Set(todayCompletedTaskKeys);
  const dailyTaskXp = learningTaskDefinitions.reduce(
    (total, task) => total + (todayCompletedTaskSet.has(getLearningTaskKey(task.id)) ? task.xp : 0),
    0,
  );
  const dailyTaskPercent = (todayCompletedTaskKeys.length / learningTaskDefinitions.length) * 100;
  const isPetHatched = Boolean(studyPet.petType || studyPet.petImage);
  const isPetFrozen = Boolean(session && studyPet.hasChosenEggColor && studyPet.lastStudyDate !== getTodayKey());
  const petName = getPetName(studyPet.petType, studyPet.petImage, copy);
  const displayedEggColor = studyPet.hasChosenEggColor ? studyPet.eggColor : pendingEggColor;
  const warmDaysShown = Math.min(studyPet.streak, eggWarmDays);
  const warmDaysLeft = Math.max(0, eggWarmDays - studyPet.streak);
  const streakCount = session ? studyPet.streak : 0;
  const isStreakWarmToday = Boolean(session && studyPet.streak > 0 && studyPet.lastStudyDate === getTodayKey());
  const streakFlameSrc = isStreakWarmToday
    ? '/pets/streak-active.png'
    : theme === 'dark'
      ? '/pets/streak-cold-dark.png'
      : '/pets/streak-cold-light.png';
  const passwordErrors = [
    accountPassword.length < 8 ? copy.passwordRule8 : '',
    !/\d/.test(accountPassword) ? copy.passwordRuleNumber : '',
    !/[A-Z]/.test(accountPassword) ? copy.passwordRuleCapital : '',
  ].filter(Boolean);
  const currentFlashcard = flashcards[currentFlashcardIndex];
  const answeredQuizCount = quizAnswers.filter((answer) => answer.trim()).length;
  const timerTotalSeconds = (timerMode === 'focus' ? focusMinutes : breakMinutes) * 60;
  const timerPercent = timerTotalSeconds > 0 ? ((timerTotalSeconds - timerSecondsLeft) / timerTotalSeconds) * 100 : 0;
  const pomodoroTotalMinutes = Math.max(25, Math.min(480, Number(pomodoroStudyMinutes) || 25));
  const pomodoroFocusSessions = Math.ceil(pomodoroTotalMinutes / 25);
  const pomodoroLongBreaks = Math.floor(Math.max(0, pomodoroFocusSessions - 1) / 4);
  const pomodoroShortBreaks = Math.max(0, pomodoroFocusSessions - 1 - pomodoroLongBreaks);
  const pomodoroBreakMinutes = pomodoroShortBreaks * 5 + pomodoroLongBreaks * 15;
  const tutorQuestionCount = tutorMessages.filter((message) => message.role === 'user').length;
  const tutorialStep = tutorialSteps[tutorialStepIndex] ?? tutorialSteps[0];
  const tutorialPopoverStyle = getTutorialPopoverStyle(tutorialTargetRect, tutorialStep.placement);
  const tutorialArrowStyle = getTutorialArrowStyle(tutorialTargetRect, tutorialStep.placement);
  const lessonRingSlots = Array.from({ length: maxSavedLessons }, (_, index) => savedLessons[index] ?? null);
  const weakKnowledgeStats = [...knowledgeStats].sort((a, b) => b.mistakes - a.mistakes || a.correct - b.correct).slice(0, 5);
  const flashcardPercent = flashcards.length > 0 ? ((currentFlashcardIndex + 1) / flashcards.length) * 100 : 0;
  const quizPercent = quiz.length > 0 ? (answeredQuizCount / quiz.length) * 100 : 0;
  const notePaperColor = theme === 'dark' ? '#151719' : '#fffdf5';
  const streakPercent = Math.min((studyPet.streak / eggWarmDays) * 100, 100);
  const calendarTodayKey = getCalendarDateKey(new Date());
  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const calendarMonthKey = `${calendarYear}-${`${calendarMonthIndex + 1}`.padStart(2, '0')}`;
  const calendarDaysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const calendarFirstWeekday = new Date(calendarYear, calendarMonthIndex, 1).getDay();
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - calendarFirstWeekday + 1;
    if (dayNumber < 1 || dayNumber > calendarDaysInMonth) return null;
    return new Date(calendarYear, calendarMonthIndex, dayNumber);
  });
  const calendarEvents: CalendarEvent[] = [];

  savedLessons.forEach((lesson) => {
    const dateKey = getCalendarDateKeyFromValue(lesson.savedAt);
    if (!dateKey) return;
    calendarEvents.push({
      dateKey,
      label: 'Lesson saved',
      detail: lesson.title,
      type: 'lesson',
    });
  });

  savedNotes.forEach((note) => {
    const dateKey = getCalendarDateKeyFromValue(note.updatedAt);
    if (!dateKey) return;
    calendarEvents.push({
      dateKey,
      label: 'Note updated',
      detail: note.title,
      type: 'note',
    });
  });

  knowledgeStats.forEach((stat) => {
    const dateKey = getCalendarDateKeyFromValue(stat.lastPracticed);
    if (!dateKey) return;
    calendarEvents.push({
      dateKey,
      label: 'Quiz practice',
      detail: `${stat.area}: ${stat.correct}/${stat.attempts} correct`,
      type: 'quiz',
    });
  });

  if (studyPet.lastStudyDate) {
    calendarEvents.push({
      dateKey: studyPet.lastStudyDate,
      label: 'Study streak',
      detail: `${studyPet.streak} ${studyPet.streak === 1 ? 'day' : 'days'}`,
      type: 'study',
    });
  }

  intervalingPlans.forEach((plan) => {
    calendarEvents.push(...getIntervalingPlanEvents(plan));
  });

  customCalendarEvents.forEach((event) => {
    calendarEvents.push({
      dateKey: event.dateKey,
      label: 'Event',
      detail: event.note.trim() ? `${event.title}: ${event.note.trim()}` : event.title,
      type: 'custom',
      customEventId: event.id,
    });
  });

  const calendarEventsByDate = new Map<string, CalendarEvent[]>();
  calendarEvents.forEach((event) => {
    calendarEventsByDate.set(event.dateKey, [...(calendarEventsByDate.get(event.dateKey) ?? []), event]);
  });
  const selectedCalendarEvents = calendarEventsByDate.get(selectedCalendarDate) ?? [];
  const selectedCalendarDateLabel = new Date(`${selectedCalendarDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const calendarMonthEventDays = Array.from(calendarEventsByDate.keys()).filter((dateKey) => dateKey.startsWith(calendarMonthKey)).length;
  const calendarMonthPercent = Math.min((calendarMonthEventDays / calendarDaysInMonth) * 100, 100);
  const toolProgress =
    page === 'flashcards'
      ? {
          label: copy.flashcards,
          detail: flashcards.length > 0 ? `${currentFlashcardIndex + 1} / ${flashcards.length}` : `0 / 0`,
          percent: flashcardPercent,
        }
      : page === 'quiz'
        ? {
            label: copy.quiz,
            detail: quiz.length > 0 ? `${answeredQuizCount} / ${quiz.length}` : `0 / 0`,
            percent: quizPercent,
          }
        : page === 'tutor'
          ? {
              label: copy.aiTutor,
              detail: `${tutorQuestionCount} ${tutorQuestionCount === 1 ? 'message' : 'messages'}`,
              percent: Math.min((tutorQuestionCount / 6) * 100, 100),
            }
          : page === 'focusTimer'
            ? {
                label: 'Focus Timer',
                detail: `${Math.round(timerPercent)}%`,
                percent: timerPercent,
              }
            : page === 'notes'
              ? {
                  label: copy.notes,
                  detail: `${savedNotes.length} / ${maxSavedNotes} saved`,
                  percent: Math.min((savedNotes.length / maxSavedNotes) * 100, 100),
                }
              : page === 'calendar'
                ? {
                    label: copy.calendar,
                    detail: `${calendarMonthEventDays} active ${calendarMonthEventDays === 1 ? 'day' : 'days'}`,
                    percent: calendarMonthPercent,
                  }
                : page === 'leaderboard'
                  ? {
                      label: copy.leaderboard,
                      detail: `${learningXp.totalXp} XP`,
                      percent: Math.min(Math.max(dailyTaskPercent, 0), 100),
                    }
                  : null;

  function goToPage(nextPage: Page, replace = false) {
    setPage(nextPage);

    const nextPath = pagePaths[nextPage];
    if (window.location.pathname === nextPath) return;

    if (replace) {
      window.history.replaceState(null, '', nextPath);
      return;
    }

    window.history.pushState(null, '', nextPath);
  }

  function moveCalendarMonth(offset: number) {
    setCalendarMonth((currentMonth) => {
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
      setSelectedCalendarDate(getCalendarDateKey(nextMonth));
      return nextMonth;
    });
  }

  function showCalendarToday() {
    const today = new Date();
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedCalendarDate(getCalendarDateKey(today));
  }

  useEffect(() => {
    setSavedLessons(readSavedLessons());
    setSavedNotes(readSavedNotes());
    setIntervalingPlans(readIntervalingPlans());
    setCustomCalendarEvents(readCustomCalendarEvents());
    setLanguage(readLanguage());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    function handleRouteChange() {
      setPage(getPageFromPath());
    }

    window.history.replaceState(null, '', pagePaths[page]);
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  useEffect(() => {
    accountStateLoadedUserRef.current = null;
    const userId = session?.user.id;
    const localState = getLocalUserAppState(userId);
    applyUserAppState(localState, userId);

    if (userId) {
      void loadAccountAppState(userId, localState);
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setHasCheckedAuth(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setHasCheckedAuth(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setHasCheckedAuth(true);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hasCheckedAuth || session || isTutorialPromptOpen || isTutorialTourOpen || hasAnsweredTutorialPrompt()) return;

    const promptTimerId = window.setTimeout(() => {
      setTutorialUserId(null);
      setTutorialStepIndex(0);
      setIsTutorialTourOpen(false);
      setIsTutorialPromptOpen(true);
    }, 700);

    return () => window.clearTimeout(promptTimerId);
  }, [hasCheckedAuth, session, isTutorialPromptOpen, isTutorialTourOpen]);

  useEffect(() => {
    if (!isTutorialTourOpen || !tutorialStep?.targetSelector) {
      setTutorialTargetRect(null);
      return;
    }

    let frameId = 0;
    let didTryScroll = false;
    let scrollTimerId: number | null = null;

    const updateTargetRect = () => {
      const target = document.querySelector<HTMLElement>(tutorialStep.targetSelector);

      if (!target) {
        setTutorialTargetRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();

      if (!didTryScroll && (rect.top < 72 || rect.bottom > window.innerHeight - 86)) {
        didTryScroll = true;
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
        scrollTimerId = window.setTimeout(updateTargetRect, 280);
      }

      setTutorialTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    frameId = window.requestAnimationFrame(updateTargetRect);
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
      if (scrollTimerId) window.clearTimeout(scrollTimerId);
    };
  }, [isTutorialTourOpen, tutorialStep, page]);

  useEffect(() => {
    if (page === 'otherMaterials') {
      loadSharedMaterials();
    }
  }, [page]);

  useEffect(() => {
    if (!session || !isSupabaseConfigured) return;
    void syncLeaderboardProfile(studyPet);
  }, [session?.user.id, currentLeaderboardName, studyPet.streak, studyPet.lastStudyDate, learningXp.totalXp, learningXp.completedTaskKeys.length]);

  useEffect(() => {
    if (page === 'leaderboard') {
      void refreshLeaderboard();
    }
  }, [page, session?.user.id, studyPet.streak, studyPet.lastStudyDate, learningXp.totalXp, learningXp.completedTaskKeys.length]);

  useEffect(() => {
    if (!session || !isSupabaseConfigured || accountStateLoadedUserRef.current !== session.user.id) return;

    if (accountStateSaveTimerRef.current) {
      window.clearTimeout(accountStateSaveTimerRef.current);
    }

    accountStateSaveTimerRef.current = window.setTimeout(() => {
      void saveAccountAppState();
    }, 800);

    return () => {
      if (accountStateSaveTimerRef.current) {
        window.clearTimeout(accountStateSaveTimerRef.current);
      }
    };
  }, [
    session?.user.id,
    savedLessons,
    savedNotes,
    studyPet,
    knowledgeStats,
    intervalingPlans,
    customCalendarEvents,
    learningXp,
  ]);

  useEffect(() => {
    return () => {
      if (hatchTimerRef.current) {
        window.clearTimeout(hatchTimerRef.current);
      }
      if (summaryCopyTimerRef.current) {
        window.clearTimeout(summaryCopyTimerRef.current);
      }
      if (accountStateSaveTimerRef.current) {
        window.clearTimeout(accountStateSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const textarea = materialTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [material]);

  useEffect(() => {
    if (page !== 'notes') return;
    resetNoteCanvas(noteImageData, noteFallbackText);
  }, [noteFallbackText, noteImageData, page, theme]);

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

  useEffect(() => {
    if (page !== 'calculator') return;

    function handleCalculatorKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTyping) return;

      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        inputCalculatorDigit(event.key);
        return;
      }

      if (event.key === '.') {
        event.preventDefault();
        inputCalculatorDecimal();
        return;
      }

      if (event.key === '+' || event.key === '-' || event.key === '*' || event.key === '/') {
        event.preventDefault();
        chooseCalculatorOperator(event.key as CalculatorOperator);
        return;
      }

      if (event.key === '^') {
        event.preventDefault();
        chooseCalculatorOperator('^');
        return;
      }

      if (event.key === 'Enter' || event.key === '=') {
        event.preventDefault();
        completeCalculator();
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        deleteCalculatorDigit();
        return;
      }

      if (event.key === 'Delete' || event.key === 'Escape') {
        event.preventDefault();
        clearCalculator();
        return;
      }

      if (event.key === '%') {
        event.preventDefault();
        applyCalculatorFunction('percent');
        return;
      }

      const shortcut = event.key.toLowerCase();
      if (shortcut === 'r') {
        event.preventDefault();
        applyCalculatorFunction('sqrt');
      } else if (shortcut === 's') {
        event.preventDefault();
        applyCalculatorFunction('sin');
      } else if (shortcut === 'c') {
        event.preventDefault();
        applyCalculatorFunction('cos');
      } else if (shortcut === 't') {
        event.preventDefault();
        applyCalculatorFunction('tan');
      } else if (shortcut === 'l') {
        event.preventDefault();
        applyCalculatorFunction('log');
      } else if (shortcut === 'n') {
        event.preventDefault();
        applyCalculatorFunction('ln');
      } else if (shortcut === 'p') {
        event.preventDefault();
        inputCalculatorConstant(Math.PI);
      } else if (shortcut === 'e') {
        event.preventDefault();
        inputCalculatorConstant(Math.E);
      }
    }

    window.addEventListener('keydown', handleCalculatorKeyDown);
    return () => window.removeEventListener('keydown', handleCalculatorKeyDown);
  }, [calculatorDisplay, calculatorOperator, calculatorStoredValue, isCalculatorWaiting, page]);

  useEffect(() => {
    if (!isTimerRunning) return;

    const timerId = window.setInterval(() => {
      setTimerSecondsLeft((secondsLeft) => {
        if (secondsLeft <= 1) {
          setIsTimerRunning(false);
          if (timerMode === 'focus') {
            completeLearningTask('focusSession');
          }
          return 0;
        }

        return secondsLeft - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isTimerRunning, timerMode, session?.user.id, studyPet.hasChosenEggColor, learningXp.completedTaskKeys.length]);

  function chooseTimerMode(nextMode: TimerMode) {
    setTimerMode(nextMode);
    setTimerSecondsLeft((nextMode === 'focus' ? focusMinutes : breakMinutes) * 60);
    setIsTimerRunning(false);
  }

  function resetTimer() {
    setTimerSecondsLeft((timerMode === 'focus' ? focusMinutes : breakMinutes) * 60);
    setIsTimerRunning(false);
  }

  function updateTimerMinutes(nextMode: TimerMode, value: number) {
    const nextMinutes = clampTimerMinutes(value);

    if (nextMode === 'focus') {
      setFocusMinutes(nextMinutes);
    } else {
      setBreakMinutes(nextMinutes);
    }

    if (timerMode === nextMode) {
      setTimerSecondsLeft(nextMinutes * 60);
      setIsTimerRunning(false);
    }
  }

  function startPomodoroPlan() {
    setFocusMinutes(25);
    setBreakMinutes(5);
    setTimerMode('focus');
    setTimerSecondsLeft(25 * 60);
    setIsTimerRunning(false);
    setIsPomodoroInfoOpen(false);
    setIsPomodoroSetupOpen(false);
    goToPage('focusTimer');
  }

  function startIntervalingPlan() {
    const startDate = getCalendarDateKey(new Date());
    const weakestLesson = getWeakestLesson(savedLessons);
    const planTitle = lessonName.trim() || weakestLesson?.title || 'Intervaling review';
    const nextPlan: IntervalingPlan = {
      id: crypto.randomUUID(),
      title: planTitle,
      startDate,
      createdAt: new Date().toISOString(),
    };
    const nextPlans = [nextPlan, ...intervalingPlans].slice(0, maxIntervalingPlans);

    updateIntervalingPlans(nextPlans);
    const today = new Date();
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedCalendarDate(startDate);
    setFocusMinutes(60);
    setBreakMinutes(10);
    setTimerMode('focus');
    setTimerSecondsLeft(60 * 60);
    setIsTimerRunning(false);
    setIsIntervalingInfoOpen(false);
    goToPage('focusTimer');
  }

  function startTeachPetChat() {
    const weakestLesson = getWeakestLesson(savedLessons);
    const weakestLessonPercent = weakestLesson ? getLessonKnowledgePercent(weakestLesson) : 0;
    const weakestQuestionArea = weakKnowledgeStats[0];
    const lessonKeywords = weakestLesson ? getStudyKeywords(getLessonMaterial(weakestLesson)) : [];
    const firstKeyword = weakestQuestionArea?.area || lessonKeywords[0] || 'the main idea';

    setIsTeachInfoOpen(false);
    setIsTeachChatOpen(true);
    setTeachAnswer('');
    setTeachLessonId(weakestLesson?.id ?? null);
    setTeachMessages([
      {
        role: 'pet',
        text: weakestLesson
          ? `Hi, I am ${petName}. Your lowest progress lesson is "${weakestLesson.title}" at ${weakestLessonPercent}%. Can you teach me about "${firstKeyword}" from that lesson? Explain it like I am totally new.`
          : `Hi, I am ${petName}. Save a lesson first and I can ask about the one you know the least. For now, teach me any topic like I am totally new.`,
      },
    ]);
  }

  function startBlurtingPractice() {
    setIsBlurtingInfoOpen(false);
    setIsBlurtingPracticeOpen(true);
    setBlurtingNotes('');
    setBlurtingReview(null);
    setBlurtingError('');
  }

  async function submitBlurtingPractice() {
    const studentNotes = blurtingNotes.trim();
    const currentMaterial = material.trim();
    const savedLessonsContext = savedLessons
      .map((lesson, index) => `Saved lesson ${index + 1}: ${lesson.title}\n${getLessonMaterial(lesson)}`)
      .join('\n\n---\n\n');
    const comparisonNotes = [
      currentMaterial ? `Current study material: ${lessonName || 'Untitled lesson'}\n${currentMaterial}` : '',
      savedLessonsContext ? `Saved lessons:\n${savedLessonsContext}` : '',
    ].filter(Boolean).join('\n\n---\n\n');

    if (!studentNotes) {
      setBlurtingError('Write what you remember first.');
      return;
    }

    if (!comparisonNotes) {
      setBlurtingError('Load or save lesson notes first so AI has something to compare with.');
      return;
    }

    if (!isSupabaseConfigured) {
      setBlurtingError('Connect Supabase and the AI function first so blurting can be checked.');
      return;
    }

    setIsBlurtingChecking(true);
    setBlurtingError('');
    setBlurtingReview(null);

    const { data, error: invokeError } = await supabase.functions.invoke<AiResponse>('ai', {
      body: {
        prompt: `Compare the student's blurting notes with the real study notes.

Return only valid JSON in this exact shape:
{
  "highlights": [
    {
      "quote": "exact words copied from the student's blurting notes",
      "category": "good",
      "note": "short reason or correction"
    }
  ],
  "review": "short review paragraph telling the student what to study next"
}

Use these categories:
- good: exact quote is correct compared with the real notes
- needsWork: exact quote is close but incomplete, vague, or missing an important detail
- wrong: exact quote is factually incorrect compared with the real notes

Important:
- Every quote must be copied exactly from the student's blurting notes.
- Do not paraphrase quote text.
- Use short complete phrases or sentences.
- Avoid overlapping quotes.
- If a point is missing from the student's notes, mention it in the review instead of making a highlight.

Real study notes:
${comparisonNotes}

Student blurting notes:
${studentNotes}`,
        system: 'You are a careful study coach checking blurting practice. Be fair, specific, and supportive. Do not invent facts outside the provided notes.',
      },
    });

    setIsBlurtingChecking(false);

    if (invokeError) {
      setBlurtingError(invokeError.message);
      return;
    }

    if (data?.error) {
      setBlurtingError(data.error);
      return;
    }

    const parsed = parseAiJson<BlurtingReview>(data?.text?.trim() ?? '');
    if (!parsed) {
      setBlurtingError('The AI did not return a blurting review. Try submitting again.');
      return;
    }

    setBlurtingReview({
      highlights: parsed.highlights ?? [],
      good: parsed.good ?? [],
      needsWork: parsed.needsWork ?? [],
      wrong: parsed.wrong ?? [],
      review: parsed.review ?? '',
    });
    completeLearningTask('blurtingReview');
  }

  async function sendTeachAnswer() {
    const answer = teachAnswer.trim();
    if (!answer || isTeachPetThinking) return;

    const activeLesson = savedLessons.find((lesson) => lesson.id === teachLessonId) || getWeakestLesson(savedLessons);
    const userAnswerCount = teachMessages.filter((message) => message.role === 'user').length;
    const lessonKeywords = activeLesson ? getStudyKeywords(getLessonMaterial(activeLesson)) : [];
    const answerKeywords = getStudyKeywords(answer);
    const focusWord = lessonKeywords[userAnswerCount % Math.max(lessonKeywords.length, 1)] || answerKeywords[0] || 'that idea';
    const lessonTitle = activeLesson?.title || 'this topic';
    const petQuestions = [
      `In "${lessonTitle}", what does "${focusWord}" mean in simpler words?`,
      `Can you give me a tiny example of "${focusWord}" from "${lessonTitle}"?`,
      `Why is "${focusWord}" important in this lesson?`,
      `I am still confused. Can you explain "${focusWord}" step by step?`,
      `How would I know when to use "${focusWord}"?`,
      `Can you connect "${focusWord}" to another part of "${lessonTitle}"?`,
    ];
    const fallbackQuestion = petQuestions[userAnswerCount % petQuestions.length];
    const nextMessages: TeachMessage[] = [...teachMessages, { role: 'user', text: answer }];

    setTeachMessages(nextMessages);
    setTeachAnswer('');
    completeLearningTask('teachPet');

    if (!isSupabaseConfigured || !activeLesson) {
      setTeachMessages([...nextMessages, { role: 'pet', text: fallbackQuestion }]);
      return;
    }

    setIsTeachPetThinking(true);
    const lessonMaterial = getLessonMaterial(activeLesson);
    const knowledgeStatsContext = formatKnowledgeStatsForAi(knowledgeStats);
    const recentChat = nextMessages
      .slice(-8)
      .map((message) => `${message.role === 'user' ? 'Student' : petName}: ${message.text}`)
      .join('\n\n');

    const { data, error: invokeError } = await supabase.functions.invoke<AiResponse>('ai', {
      body: {
        prompt: `The student is practicing the "Teach Somebody" study method by teaching their pet.

Weakest lesson title: ${activeLesson.title}
Weakest lesson progress: ${getLessonKnowledgePercent(activeLesson)}%

Lesson material:
${lessonMaterial}

Student quiz knowledge map:
${knowledgeStatsContext}

Recent chat:
${recentChat}

Student's latest explanation:
${answer}

Write exactly one short follow-up question from the pet. The question must be based on the lesson material, the student's explanation, and the quiz knowledge map. Prefer areas with more mistakes when they fit the lesson. The pet should sound confused in a cute/simple way, but it should ask an accurate question that helps the student explain the weak lesson better.`,
        system: 'You are a study pet helping with the Teach Somebody method. Use the quiz knowledge map to focus weak areas. Ask only one clear question. Do not answer the topic yourself. Do not mention that you are an AI. Keep it under 28 words.',
      },
    });

    setIsTeachPetThinking(false);

    const aiQuestion = data?.text?.trim();
    const nextQuestion = invokeError || data?.error || !aiQuestion ? fallbackQuestion : aiQuestion;
    setTeachMessages([...nextMessages, { role: 'pet', text: nextQuestion }]);
  }

  function formatCalculatorValue(value: number) {
    if (!Number.isFinite(value)) return 'Error';
    return Number.parseFloat(value.toPrecision(12)).toString();
  }

  function calculateNextValue(firstValue: number, secondValue: number, operator: CalculatorOperator) {
    if (operator === '+') return firstValue + secondValue;
    if (operator === '-') return firstValue - secondValue;
    if (operator === '*') return firstValue * secondValue;
    if (operator === '^') return firstValue ** secondValue;
    return secondValue === 0 ? Number.NaN : firstValue / secondValue;
  }

  function clearCalculator() {
    setCalculatorDisplay('0');
    setCalculatorStoredValue(null);
    setCalculatorOperator(null);
    setIsCalculatorWaiting(false);
  }

  function inputCalculatorDigit(digit: string) {
    if (calculatorDisplay === 'Error' || isCalculatorWaiting) {
      setCalculatorDisplay(digit);
      setIsCalculatorWaiting(false);
      return;
    }

    setCalculatorDisplay(calculatorDisplay === '0' ? digit : `${calculatorDisplay}${digit}`);
  }

  function inputCalculatorDecimal() {
    if (calculatorDisplay === 'Error' || isCalculatorWaiting) {
      setCalculatorDisplay('0.');
      setIsCalculatorWaiting(false);
      return;
    }

    if (!calculatorDisplay.includes('.')) {
      setCalculatorDisplay(`${calculatorDisplay}.`);
    }
  }

  function toggleCalculatorSign() {
    if (calculatorDisplay === '0' || calculatorDisplay === 'Error') return;
    setCalculatorDisplay(calculatorDisplay.startsWith('-') ? calculatorDisplay.slice(1) : `-${calculatorDisplay}`);
  }

  function deleteCalculatorDigit() {
    if (isCalculatorWaiting || calculatorDisplay === 'Error' || calculatorDisplay.length <= 1) {
      setCalculatorDisplay('0');
      setIsCalculatorWaiting(false);
      return;
    }

    setCalculatorDisplay(calculatorDisplay.slice(0, -1));
  }

  function chooseCalculatorOperator(nextOperator: CalculatorOperator) {
    const inputValue = Number(calculatorDisplay);

    if (calculatorStoredValue === null) {
      setCalculatorStoredValue(inputValue);
    } else if (calculatorOperator && !isCalculatorWaiting) {
      const result = calculateNextValue(calculatorStoredValue, inputValue, calculatorOperator);
      setCalculatorDisplay(formatCalculatorValue(result));
      setCalculatorStoredValue(result);
    }

    setCalculatorOperator(nextOperator);
    setIsCalculatorWaiting(true);
  }

  function completeCalculator() {
    if (calculatorStoredValue === null || !calculatorOperator) return;

    const inputValue = Number(calculatorDisplay);
    const result = calculateNextValue(calculatorStoredValue, inputValue, calculatorOperator);
    setCalculatorDisplay(formatCalculatorValue(result));
    setCalculatorStoredValue(null);
    setCalculatorOperator(null);
    setIsCalculatorWaiting(true);
  }

  function applyCalculatorFunction(name: 'sqrt' | 'square' | 'sin' | 'cos' | 'tan' | 'log' | 'ln' | 'percent') {
    const value = Number(calculatorDisplay);
    let result = value;

    if (name === 'sqrt') result = value < 0 ? Number.NaN : Math.sqrt(value);
    if (name === 'square') result = value ** 2;
    if (name === 'sin') result = Math.sin((value * Math.PI) / 180);
    if (name === 'cos') result = Math.cos((value * Math.PI) / 180);
    if (name === 'tan') result = Math.tan((value * Math.PI) / 180);
    if (name === 'log') result = value <= 0 ? Number.NaN : Math.log10(value);
    if (name === 'ln') result = value <= 0 ? Number.NaN : Math.log(value);
    if (name === 'percent') result = value / 100;

    setCalculatorDisplay(formatCalculatorValue(result));
    setIsCalculatorWaiting(true);
  }

  function inputCalculatorConstant(value: number) {
    setCalculatorDisplay(formatCalculatorValue(value));
    setIsCalculatorWaiting(true);
  }

  function getCurrentUserAppState(): UserAppState {
    return {
      savedLessons,
      savedNotes,
      studyPet,
      knowledgeStats,
      intervalingPlans,
      customCalendarEvents,
      learningXp,
    };
  }

  function applyUserAppState(nextState: UserAppState, userId?: string) {
    setSavedLessons(nextState.savedLessons);
    setSavedNotes(nextState.savedNotes);
    setStudyPet(nextState.studyPet);
    setPendingEggColor(nextState.studyPet.eggColor);
    setHatchPopup(null);
    setKnowledgeStats(nextState.knowledgeStats);
    setIntervalingPlans(nextState.intervalingPlans);
    setCustomCalendarEvents(nextState.customCalendarEvents);
    setLearningXp(nextState.learningXp);
    persistUserAppStateLocally(userId, nextState);
  }

  async function saveUserAppStateForUser(userId: string, nextState: UserAppState) {
    if (!isSupabaseConfigured) return false;

    const { error: saveError } = await supabase.from('user_app_state').upsert(
      {
        user_id: userId,
        saved_lessons: nextState.savedLessons,
        saved_notes: nextState.savedNotes,
        study_pet: nextState.studyPet,
        knowledge_stats: nextState.knowledgeStats,
        intervaling_plans: nextState.intervalingPlans,
        custom_calendar_events: nextState.customCalendarEvents,
        learning_xp: nextState.learningXp,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    return !saveError;
  }

  async function saveAccountAppState() {
    if (!session || accountStateLoadedUserRef.current !== session.user.id) return false;
    const currentState = getCurrentUserAppState();
    persistUserAppStateLocally(session.user.id, currentState);
    return saveUserAppStateForUser(session.user.id, currentState);
  }

  async function loadAccountAppState(userId: string, localState = getLocalUserAppState(userId)) {
    if (!isSupabaseConfigured) {
      accountStateLoadedUserRef.current = userId;
      return;
    }

    const { data, error: loadError } = await supabase
      .from('user_app_state')
      .select('user_id, saved_lessons, saved_notes, study_pet, knowledge_stats, intervaling_plans, custom_calendar_events, learning_xp, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (loadError) {
      accountStateLoadedUserRef.current = userId;
      return;
    }

    const remoteState = data ? normalizeUserAppStateRow(data as UserAppStateRow) : null;
    const mergedState = remoteState ? mergeUserAppState(remoteState, localState) : localState;

    applyUserAppState(mergedState, userId);
    accountStateLoadedUserRef.current = userId;

    if (!remoteState || hasUserAppStateContent(localState)) {
      await saveUserAppStateForUser(userId, mergedState);
    }
  }

  function updateSavedLessons(nextLessons: SavedLesson[]) {
    setSavedLessons(nextLessons);
    window.localStorage.setItem(getSavedLessonsKey(session?.user.id), JSON.stringify(nextLessons));
  }

  function updateSavedNotes(nextNotes: StudyNote[]) {
    setSavedNotes(nextNotes);
    window.localStorage.setItem(getSavedNotesKey(session?.user.id), JSON.stringify(nextNotes));
  }

  function updateKnowledgeStats(nextStats: KnowledgeAreaStat[]) {
    setKnowledgeStats(nextStats);
    window.localStorage.setItem(getKnowledgeStatsKey(session?.user.id), JSON.stringify(nextStats));
  }

  function updateIntervalingPlans(nextPlans: IntervalingPlan[]) {
    setIntervalingPlans(nextPlans);
    window.localStorage.setItem(getIntervalingPlansKey(session?.user.id), JSON.stringify(nextPlans));
  }

  function updateCustomCalendarEvents(nextEvents: CustomCalendarEvent[]) {
    setCustomCalendarEvents(nextEvents);
    window.localStorage.setItem(getCustomCalendarEventsKey(session?.user.id), JSON.stringify(nextEvents));
  }

  function completeLearningTask(taskId: LearningTaskId) {
    if (!session) return;

    const task = learningTaskDefinitions.find((item) => item.id === taskId);
    if (!task) return;

    const taskKey = getLearningTaskKey(taskId);

    setLearningXp((currentXp) => {
      if (currentXp.completedTaskKeys.includes(taskKey)) return currentXp;

      const nextXp = {
        totalXp: currentXp.totalXp + task.xp,
        completedTaskKeys: [taskKey, ...currentXp.completedTaskKeys].slice(0, 600),
        updatedAt: new Date().toISOString(),
      };

      window.localStorage.setItem(getLearningXpKey(session.user.id), JSON.stringify(nextXp));
      return nextXp;
    });

    markStudyActivity();
  }

  function deleteIntervalingPlan(planId: string) {
    updateIntervalingPlans(intervalingPlans.filter((plan) => plan.id !== planId));
  }

  function openCalendarEventForm() {
    setCalendarEventDate(selectedCalendarDate);
    setCalendarEventTitle('');
    setCalendarEventNote('');
    setCalendarEventError('');
    setIsCalendarEventFormOpen(true);
  }

  function saveCustomCalendarEvent() {
    const title = calendarEventTitle.trim();
    const dateKey = getCalendarDateKeyFromValue(calendarEventDate);

    if (!title) {
      setCalendarEventError('Add an event title first.');
      return;
    }

    if (!dateKey) {
      setCalendarEventError('Choose a date for the event.');
      return;
    }

    const nextEvent: CustomCalendarEvent = {
      id: crypto.randomUUID(),
      title,
      dateKey,
      note: calendarEventNote.trim(),
      createdAt: new Date().toISOString(),
    };
    const nextEvents = [nextEvent, ...customCalendarEvents]
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(0, maxCustomCalendarEvents);
    const eventDate = new Date(`${dateKey}T00:00:00`);

    updateCustomCalendarEvents(nextEvents);
    setSelectedCalendarDate(dateKey);
    setCalendarMonth(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
    setIsCalendarEventFormOpen(false);
    setCalendarEventError('');
  }

  function deleteCustomCalendarEvent(eventId: string) {
    updateCustomCalendarEvents(customCalendarEvents.filter((event) => event.id !== eventId));
  }

  function recordQuizKnowledgeStats(grades: QuizGrade[]) {
    const now = new Date().toISOString();
    const statMap = new Map<string, KnowledgeAreaStat>();

    knowledgeStats.forEach((stat) => {
      statMap.set(stat.area.toLowerCase(), { ...stat });
    });

    quiz.forEach((item, index) => {
      const area = normalizeQuizArea(item.area, item.question);
      const key = area.toLowerCase();
      const existing = statMap.get(key) ?? {
        area,
        attempts: 0,
        correct: 0,
        mistakes: 0,
        lastPracticed: now,
      };
      const wasCorrect = Boolean(grades[index]?.correct);

      statMap.set(key, {
        ...existing,
        area: existing.area || area,
        attempts: existing.attempts + 1,
        correct: existing.correct + (wasCorrect ? 1 : 0),
        mistakes: existing.mistakes + (wasCorrect ? 0 : 1),
        lastPracticed: now,
      });
    });

    const nextStats = Array.from(statMap.values())
      .sort((a, b) => b.mistakes - a.mistakes || b.attempts - a.attempts)
      .slice(0, 30);

    updateKnowledgeStats(nextStats);
  }

  function getNoteCanvasContext() {
    const canvas = noteCanvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return null;

    context.lineCap = 'round';
    context.lineJoin = 'round';
    return context;
  }

  function drawTextNoteFallback(context: CanvasRenderingContext2D, text: string) {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = '';

    words.forEach((word) => {
      const testLine = line ? `${line} ${word}` : word;
      if (context.measureText(testLine).width > 1040 && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    });

    if (line) lines.push(line);

    context.fillStyle = theme === 'dark' ? '#f7f8f8' : '#142126';
    context.font = '28px Inter, system-ui, sans-serif';
    context.textBaseline = 'top';
    lines.slice(0, 12).forEach((textLine, index) => {
      context.fillText(textLine, 72, 72 + index * 44);
    });
  }

  function resetNoteCanvas(imageData = '', fallbackText = '') {
    const context = getNoteCanvasContext();
    if (!context) return;

    context.clearRect(0, 0, noteCanvasWidth, noteCanvasHeight);
    context.fillStyle = notePaperColor;
    context.fillRect(0, 0, noteCanvasWidth, noteCanvasHeight);

    context.strokeStyle = theme === 'dark' ? 'rgba(247, 248, 248, 0.07)' : 'rgba(47, 111, 115, 0.12)';
    context.lineWidth = 1;
    for (let y = 82; y < noteCanvasHeight; y += 48) {
      context.beginPath();
      context.moveTo(56, y);
      context.lineTo(noteCanvasWidth - 56, y);
      context.stroke();
    }

    if (imageData) {
      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0, noteCanvasWidth, noteCanvasHeight);
      };
      image.src = imageData;
      return;
    }

    if (fallbackText) {
      drawTextNoteFallback(context, fallbackText);
    }
  }

  function getNotePoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * noteCanvasWidth,
      y: ((event.clientY - rect.top) / rect.height) * noteCanvasHeight,
    };
  }

  function drawNoteDot(point: { x: number; y: number }) {
    const context = getNoteCanvasContext();
    if (!context) return;

    context.fillStyle = notePenColor;
    context.beginPath();
    context.arc(point.x, point.y, notePenSize / 2, 0, Math.PI * 2);
    context.fill();
  }

  function drawNoteLine(from: { x: number; y: number }, to: { x: number; y: number }) {
    const context = getNoteCanvasContext();
    if (!context) return;

    context.strokeStyle = notePenColor;
    context.lineWidth = notePenSize;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  function startNoteDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getNotePoint(event);
    isNoteDrawingRef.current = true;
    lastNotePointRef.current = point;
    drawNoteDot(point);
    setIsNoteDirty(true);
    setNotesError('');
    setNotesNotice('');
  }

  function continueNoteDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isNoteDrawingRef.current || !lastNotePointRef.current) return;

    event.preventDefault();
    const point = getNotePoint(event);
    drawNoteLine(lastNotePointRef.current, point);
    lastNotePointRef.current = point;
  }

  function stopNoteDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isNoteDrawingRef.current) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    isNoteDrawingRef.current = false;
    lastNotePointRef.current = null;
  }

  function startNewNote() {
    setActiveNoteId(null);
    setNoteTitle('');
    setNoteImageData('');
    setNoteFallbackText('');
    setIsNoteDirty(false);
    setNotesError('');
    setNotesNotice('');
    resetNoteCanvas('');
  }

  function clearStudyNoteCanvas() {
    resetNoteCanvas('');
    setNoteImageData('');
    setNoteFallbackText('');
    setIsNoteDirty(true);
    setNotesError('');
    setNotesNotice('Page cleared.');
  }

  function saveStudyNote() {
    const trimmedTitle = noteTitle.trim() || `Note ${savedNotes.length + 1}`;
    const canvas = noteCanvasRef.current;
    const imageData = canvas?.toDataURL('image/png') ?? noteImageData;

    if (!imageData || (!isNoteDirty && !activeNoteId && !noteImageData)) {
      setNotesError('Draw something on the page first.');
      setNotesNotice('');
      return;
    }

    const nextNote: StudyNote = {
      id: activeNoteId ?? crypto.randomUUID(),
      title: trimmedTitle.slice(0, 70),
      body: '',
      imageData,
      updatedAt: new Date().toISOString(),
    };

    const withoutCurrent = savedNotes.filter((note) => note.id !== nextNote.id);
    updateSavedNotes([nextNote, ...withoutCurrent].slice(0, maxSavedNotes));
    setActiveNoteId(nextNote.id);
    setNoteTitle(nextNote.title);
    setNoteImageData(imageData);
    setNoteFallbackText('');
    setIsNoteDirty(false);
    setNotesError('');
    setNotesNotice('Freehand note saved.');
    completeLearningTask('saveNote');
  }

  function openStudyNote(note: StudyNote) {
    setActiveNoteId(note.id);
    setNoteTitle(note.title);
    setNoteImageData(note.imageData ?? '');
    setNoteFallbackText(note.imageData ? '' : (note.body ?? ''));
    setIsNoteDirty(false);
    setNotesError('');
    setNotesNotice(`Opened "${note.title}".`);
    resetNoteCanvas(note.imageData ?? '', note.body ?? '');
  }

  function deleteStudyNote(id: string) {
    const nextNotes = savedNotes.filter((note) => note.id !== id);
    updateSavedNotes(nextNotes);

    if (activeNoteId === id) {
      startNewNote();
    } else {
      setNotesError('');
      setNotesNotice('Note deleted.');
    }
  }

  function updateLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    window.localStorage.setItem(languageKey, nextLanguage);
  }

  function updateTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    window.localStorage.setItem(themeKey, nextTheme);
  }

  function markStudyActivity() {
    if (!session || !studyPet.hasChosenEggColor) return;

    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    setStudyPet((currentPet) => {
      if (currentPet.lastStudyDate === today) return currentPet;

      const continuedStreak = currentPet.lastStudyDate === yesterday;
      const nextStreak = continuedStreak ? currentPet.streak + 1 : 1;
      const shouldKeepCurrentPet = continuedStreak && (currentPet.petType || currentPet.petImage);
      const shouldHatch = nextStreak >= eggWarmDays && !shouldKeepCurrentPet;
      const hatchPetImage = shouldHatch ? getRandomEggPetImage(currentPet.eggColor) : null;
      const nextPetImage = shouldKeepCurrentPet && currentPet.petImage ? currentPet.petImage : null;
      const nextPetType =
        shouldKeepCurrentPet && currentPet.petType
          ? currentPet.petType
          : shouldHatch && !hatchPetImage
            ? petTypes[Math.floor(Math.random() * petTypes.length)]
            : null;
      const nextPet = {
        streak: nextStreak,
        lastStudyDate: today,
        petType: nextPetType,
        petImage: nextPetImage,
        eggColor: currentPet.eggColor,
        hasChosenEggColor: currentPet.hasChosenEggColor,
      };

      window.localStorage.setItem(getStudyPetKey(session.user.id), JSON.stringify(nextPet));
      if (hatchPetImage) {
        setHatchPopup({ eggColor: currentPet.eggColor, petImage: hatchPetImage, stage: 'ready' });
      }
      return nextPet;
    });
  }

  function chooseEggColor(eggColor: EggColor) {
    if (!session || isPetHatched || studyPet.hasChosenEggColor) return;
    setPendingEggColor(eggColor);
  }

  function confirmEggColor() {
    if (!session || isPetHatched || studyPet.hasChosenEggColor) return;

    setStudyPet((currentPet) => {
      const nextPet = {
        ...currentPet,
        streak: 0,
        lastStudyDate: '',
        petImage: null,
        eggColor: pendingEggColor,
        hasChosenEggColor: true,
      };
      window.localStorage.setItem(getStudyPetKey(session.user.id), JSON.stringify(nextPet));
      return nextPet;
    });
  }

  function hatchEgg() {
    const userId = session?.user.id;
    if (!userId || !hatchPopup || hatchPopup.stage !== 'ready') return;

    if (hatchTimerRef.current) {
      window.clearTimeout(hatchTimerRef.current);
    }

    setHatchPopup((currentPopup) => currentPopup ? { ...currentPopup, stage: 'cracked' } : currentPopup);

    hatchTimerRef.current = window.setTimeout(() => {
      setHatchPopup((currentPopup) => {
        if (!currentPopup) return currentPopup;

        setStudyPet((currentPet) => {
          const nextPet = {
            ...currentPet,
            petType: null,
            petImage: currentPopup.petImage,
            eggColor: currentPopup.eggColor,
            hasChosenEggColor: true,
          };
          window.localStorage.setItem(getStudyPetKey(userId), JSON.stringify(nextPet));
          return nextPet;
        });

        return { ...currentPopup, stage: 'open' };
      });

      hatchTimerRef.current = window.setTimeout(() => {
        setHatchPopup(null);
      }, 1300);
    }, 850);
  }

  function clearResults() {
    setSummary('');
    setIsSummaryCopied(false);
    setFlashcards([]);
    setCurrentFlashcardIndex(0);
    setIsFlashcardFlipped(false);
    setQuiz([]);
    setQuizAnswers([]);
    setQuizGrades([]);
    setShowQuizAnswers(false);
    setIsQuizSubmitted(false);
    setIsQuizChecking(false);
    setQuizError('');
  }

  function goHome() {
    goToPage('study');
    setError('');
    setNotice('');
  }

  function requireSignedIn(message: string) {
    if (session) return true;
    setAccountNotice(message);
    setError('');
    setNotice('');
    setTutorError('');
    goToPage('account');
    return false;
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

  async function syncLeaderboardProfile(nextPet = studyPet) {
    if (!isSupabaseConfigured || !session) return false;

    const { error: syncError } = await supabase.from('leaderboard_profiles').upsert(
      {
        user_id: session.user.id,
        display_name: currentLeaderboardName.slice(0, 50),
        xp: Math.max(0, learningXp.totalXp),
        completed_tasks: learningXp.completedTaskKeys.length,
        streak: Math.max(0, nextPet.streak),
        last_study_date: nextPet.lastStudyDate || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (syncError) {
      if (page === 'leaderboard') {
        setLeaderboardError(syncError.message);
      }
      return false;
    }

    return true;
  }

  async function loadLeaderboard() {
    setLeaderboardError('');

    if (!isSupabaseConfigured) {
      setLeaderboardError('Connect Supabase first so the leaderboard can load.');
      return;
    }

    setIsLeaderboardLoading(true);
    const { data, error: loadError } = await supabase
      .from('leaderboard_profiles')
      .select('user_id, display_name, xp, completed_tasks, streak, last_study_date, updated_at')
      .order('xp', { ascending: false })
      .order('streak', { ascending: false })
      .order('last_study_date', { ascending: false })
      .limit(20);
    setIsLeaderboardLoading(false);

    if (loadError) {
      setLeaderboardError(loadError.message);
      return;
    }

    setLeaderboardRows(data ?? []);
  }

  async function refreshLeaderboard() {
    if (session) {
      await syncLeaderboardProfile(studyPet);
    }
    await loadLeaderboard();
  }

  async function uploadSharedMaterial() {
    const subject = sharedSubject.trim();
    const title = sharedTitle.trim();
    const text = sharedText.trim();

    if (!session) {
      setSharedError(copy.signInToUpload);
      setSharedNotice('');
      setAccountNotice(copy.enterAccountToUpload);
      goToPage('account');
      return;
    }

    if (!subject || !title || !text) {
      setSharedError(copy.addSubjectTitleMaterial);
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
    setSharedNotice(copy.materialUploaded);
    loadSharedMaterials();
  }

  async function deleteSharedMaterial(item: SharedMaterial) {
    if (!session || item.user_id !== session.user.id) {
      setSharedError(copy.deleteOwnOnly);
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
    setSharedNotice(copy.materialDeleted);
  }

  function askNewAccountTutorial(userId?: string) {
    if (!userId || hasAnsweredTutorialPrompt(userId)) return;

    setTutorialUserId(userId);
    setTutorialStepIndex(0);
    setIsTutorialTourOpen(false);
    setIsTutorialPromptOpen(true);
  }

  function skipTutorial() {
    markTutorialPromptAnswered(tutorialUserId ?? undefined);
    setIsTutorialPromptOpen(false);
    setIsTutorialTourOpen(false);
    setTutorialUserId(null);
  }

  function startTutorial() {
    markTutorialPromptAnswered(tutorialUserId ?? undefined);
    setIsTutorialPromptOpen(false);
    setIsTutorialTourOpen(true);
    setTutorialStepIndex(0);
    goToPage(tutorialSteps[0].page);
  }

  function closeTutorial() {
    setIsTutorialPromptOpen(false);
    setIsTutorialTourOpen(false);
    setTutorialUserId(null);
  }

  function goToTutorialStep(nextIndex: number) {
    const clampedIndex = Math.min(Math.max(nextIndex, 0), tutorialSteps.length - 1);
    setTutorialStepIndex(clampedIndex);
    goToPage(tutorialSteps[clampedIndex].page);
  }

  function nextTutorialStep() {
    if (tutorialStepIndex >= tutorialSteps.length - 1) {
      closeTutorial();
      return;
    }

    goToTutorialStep(tutorialStepIndex + 1);
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
      setAccountError(authMode === 'signUp' ? copy.addYourNameEmailPassword : copy.addYourEmailPassword);
      setAccountNotice('');
      return;
    }

    if (authMode === 'signUp' && passwordErrors.length > 0) {
      setAccountError(`${copy.passwordNeeds}: ${passwordErrors.join(', ')}.`);
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
      setAccountNotice(data.session ? copy.accountCreated : copy.accountCreatedConfirm);
      setAccountPassword('');
      askNewAccountTutorial(data.user?.id);
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
    setAccountNotice(copy.signedInUpload);
    setAccountPassword('');
  }

  async function signInWithGoogle() {
    if (!isSupabaseConfigured) {
      setAccountError('Connect Supabase first so accounts can work.');
      return;
    }

    setAccountError('');
    setAccountNotice('');

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (googleError) {
      setAccountError(googleError.message);
    }
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setAccountError(signOutError.message);
      return;
    }

    setSession(null);
    setAccountNotice(copy.signedOut);
    setAccountError('');
  }

  function useSharedMaterial(item: SharedMaterial) {
    setLessonName(item.title);
    setMaterial(item.material);
    goToPage('study');
    setNotice(`${copy.loaded} "${item.title}".`);
    setError('');
    clearResults();
  }

  async function askTutor() {
    const question = tutorQuestion.trim();

    if (!requireSignedIn(copy.signInForTutor)) {
      return;
    }

    if (!question) {
      setTutorError(copy.typeTutorQuestion);
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

    const knowledgeStatsContext = formatKnowledgeStatsForAi(knowledgeStats);

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

Student quiz knowledge map:
${knowledgeStatsContext}

Recent chat:
${recentChat}

Student question:
${question}`,
        system: 'You are a friendly AI tutor. Prioritize the student saved lessons and quiz knowledge map over general knowledge. Explain step by step, keep answers clear, ask one follow-up question when useful, and do not invent facts outside the provided material unless the student asks for general explanation.',
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
    markStudyActivity();
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
    if (flashcards.length > 0 && currentFlashcardIndex === flashcards.length - 1) {
      completeLearningTask('reviewFlashcards');
    }
    setCurrentFlashcardIndex((index) => (index + 1) % flashcards.length);
    setIsFlashcardFlipped(false);
  }

  async function submitQuiz() {
    if (!isSupabaseConfigured) {
      setQuizError('Connect Supabase and the AI function first so answers can be checked by AI.');
      return;
    }

    if (quiz.length === 0) return;

    const shouldRecordStats = !isQuizSubmitted;

    setIsQuizChecking(true);
    setQuizError('');

    const quizToGrade = quiz.map((item, index) => ({
      question: item.question,
      correctAnswer: item.answer,
      studentAnswer: quizAnswers[index]?.trim() || '',
    }));

    const { data, error: invokeError } = await supabase.functions.invoke<AiResponse>('ai', {
      body: {
        prompt: `Grade these quiz answers. Mark an answer correct when it means the same thing as the correct answer, even if the wording is different. Be fair with short explanation answers.

Return only valid JSON in this exact shape:
{
  "grades": [
    { "correct": true, "feedback": "short feedback for the student" }
  ]
}

Quiz answers to grade:
${JSON.stringify(quizToGrade, null, 2)}`,
        system: 'You are a fair quiz grader. Accept answers that are semantically correct. Keep feedback short and helpful.',
      },
    });

    setIsQuizChecking(false);

    if (invokeError) {
      setQuizError(invokeError.message);
      return;
    }

    if (data?.error) {
      setQuizError(data.error);
      return;
    }

    const parsed = parseAiJson<QuizGradeResponse>(data?.text?.trim() ?? '');
    const nextGrades = parsed?.grades ?? [];

    if (nextGrades.length !== quiz.length) {
      setQuizError('The AI did not return grades for every question. Try submitting again.');
      return;
    }

    setQuizGrades(nextGrades);
    setIsQuizSubmitted(true);
    setShowQuizAnswers(true);
    if (shouldRecordStats) {
      recordQuizKnowledgeStats(nextGrades);
    }
    completeLearningTask('finishQuiz');
  }

  function saveLesson() {
    const trimmedName = lessonName.trim();
    const trimmedMaterial = material.trim();

    if (!requireSignedIn(copy.signInForSave)) {
      return;
    }

    if (!trimmedName) {
      setError(copy.nameLessonFirst);
      setNotice('');
      return;
    }

    if (!trimmedMaterial) {
      setError(copy.pasteMaterialFirst);
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
    setNotice(copy.lessonSaved);
    completeLearningTask('saveLesson');
  }

  function loadLesson(lesson: SavedLesson) {
    setLessonName(lesson.title);
    setMaterial(getLessonMaterial(lesson));
    setError('');
    setNotice(`${copy.loaded} "${lesson.title}".`);
    goToPage('study');
    clearResults();
  }

  function deleteLesson(id: string) {
    updateSavedLessons(savedLessons.filter((lesson) => lesson.id !== id));
    setNotice(copy.lessonDeleted);
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
      setError(copy.pasteSourceFirst);
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
    setNotice(`${copy.addAnotherSource}: "${lesson.title}".`);
  }

  function buildPrompt(
    trimmedMaterial: string,
    quizKeyboardPreference?: QuizKeyboardPreference,
    quizKeyboardLanguage?: string,
  ) {
    if (mode === 'flashcards') {
      return `Turn these study notes into flashcards for every important word, term, concept, formula, and definition that should be memorized.
Create as many flashcards as the material needs. Do not stop at a fixed number.
Make one flashcard per idea, with the front as a term or short question and the back as the clear definition or answer.

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
      const requestedQuestionCount = Math.min(20, Math.max(1, Math.round(quizQuestionCount)));
      const knowledgeInstruction = knowledgeStats.length
        ? `\n\nStudent quiz knowledge map:\n${formatKnowledgeStatsForAi(knowledgeStats)}\nUse this to include more questions from areas with more mistakes, while still testing the study material.`
        : '';
      const keyboardInstruction =
        quizKeyboardPreference === 'englishAnswers'
          ? `\n\nKeyboard adjustment: The notes seem to include ${quizKeyboardLanguage || 'another language'}, but the student said they do not have that keyboard. Write every quiz question in English, make every correct answer possible to type in English, and do not require typing non-English characters. Test the same ideas from the notes, just make the student's typed answers English-friendly.`
          : '';

      return `Create a short study quiz from these notes.
${keyboardInstruction}
${knowledgeInstruction}

Return only valid JSON in this exact shape:
{
  "quiz": [
    { "area": "short topic area", "question": "short quiz question", "answer": "correct answer" }
  ]
}

Make exactly ${requestedQuestionCount} questions. Study material:
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

  async function runStudyGeneration(
    trimmedMaterial: string,
    quizKeyboardPreference?: QuizKeyboardPreference,
    quizKeyboardLanguage?: string,
  ) {
    setIsLoading(true);
    setError('');
    setNotice('');
    clearResults();

    const { data, error: invokeError } = await supabase.functions.invoke<AiResponse>('ai', {
      body: {
        prompt: buildPrompt(trimmedMaterial, quizKeyboardPreference, quizKeyboardLanguage),
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
      goToPage('flashcards');
      completeLearningTask('makeFlashcards');
      return;
    }

    if (mode === 'quiz') {
      const parsed = parseAiJson<QuizResponse>(text);
      const nextQuiz = parsed?.quiz ?? [];
      if (nextQuiz.length === 0) {
        setError('The AI did not return quiz questions. Try again with more detailed notes.');
        return;
      }
      setQuiz(nextQuiz);
      setQuizAnswers(nextQuiz.map(() => ''));
      setQuizGrades([]);
      setShowQuizAnswers(false);
      setIsQuizSubmitted(false);
      setQuizError('');
      goToPage('quiz');
      markStudyActivity();
      return;
    }

    setSummary(text || copy.noSummaryReturned);
    completeLearningTask('summary');
  }

  async function generateStudyHelp() {
    const trimmedMaterial = material.trim();

    if (mode === 'quiz' && !requireSignedIn(copy.signInForQuiz)) {
      return;
    }

    if (!trimmedMaterial) {
      setError(copy.pasteMaterialFirst);
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

    if (mode === 'quiz') {
      const quizLanguageName = detectQuizKeyboardLanguage(trimmedMaterial);
      if (quizLanguageName) {
        setQuizKeyboardCheck({ material: trimmedMaterial, languageName: quizLanguageName });
        setError('');
        setNotice('');
        return;
      }
    }

    await runStudyGeneration(trimmedMaterial);
  }

  async function answerQuizKeyboardCheck(preference: QuizKeyboardPreference) {
    if (!quizKeyboardCheck) return;

    const nextCheck = quizKeyboardCheck;
    setQuizKeyboardCheck(null);
    await runStudyGeneration(nextCheck.material, preference, nextCheck.languageName);
  }

  async function copySummaryToClipboard() {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      if (summaryCopyTimerRef.current) {
        window.clearTimeout(summaryCopyTimerRef.current);
      }
      setIsSummaryCopied(true);
      setNotice('Summary copied.');
      summaryCopyTimerRef.current = window.setTimeout(() => {
        setIsSummaryCopied(false);
      }, 1800);
    } catch {
      setIsSummaryCopied(false);
      setError('Could not copy the summary.');
    }
  }

  return (
    <main className={isToolDrawerOpen && page !== 'starter' ? 'app-shell drawer-open' : 'app-shell'}>
      <section className="study-tool">
        <div className="intro">
          <div>
            <p className="eyebrow">{copy.studyHelper}</p>
            <h1>
              {page === 'lessons'
                ? copy.lessons
                : page === 'otherMaterials'
                  ? copy.otherMaterials
                  : page === 'tutor'
                    ? copy.aiTutor
                    : page === 'account'
                      ? copy.account
                      : page === 'flashcards'
                        ? copy.flashcards
                        : page === 'quiz'
                          ? copy.quiz
                          : page === 'focusTimer'
                            ? 'Focus Timer'
                            : page === 'progress'
                              ? copy.progress
                              : page === 'notes'
                                ? copy.notes
                                : page === 'calculator'
                                  ? copy.calculator
                                  : page === 'calendar'
                                    ? copy.calendar
                                    : page === 'leaderboard'
                                      ? copy.leaderboard
                                      : page === 'studyMethods'
                                        ? copy.studyMethods
                      : copy.studyHelperTitle}
            </h1>
          </div>
          <div className="header-actions">
            <div
              className={isStreakWarmToday ? 'streak-chip active' : 'streak-chip cold'}
              data-tutorial-target="streak-chip"
              aria-label={`${copy.streak}: ${streakCount}`}
              title={isStreakWarmToday ? 'Streak warmed today' : 'Study today to warm your streak'}
            >
              <img src={streakFlameSrc} alt="" />
              <span>
                <strong>{streakCount}</strong>
                <small>{copy.streak}</small>
              </span>
            </div>
            {page === 'starter' ? null : page === 'study' ? (
              <>
                <button
                  className="nav-button"
                  type="button"
                  onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                  data-tutorial-target="study-options-button"
                >
                  {copy.studyOptions}
                </button>
                <button
                  className="nav-button"
                  type="button"
                  onClick={() => goToPage('lessons')}
                  data-tutorial-target="lessons-button"
                >
                  {copy.lessons}
                </button>
              </>
            ) : page === 'otherMaterials' ? (
              !isUploadingSharedMaterial && (
                <button
                  className="add-material-button"
                  type="button"
                  onClick={() => {
                    if (!session) {
                      setAccountNotice(copy.enterAccountToUpload);
                      goToPage('account');
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
            ) : page === 'account' ? (
              <div className="account-preferences">
                <label className="language-field compact-language-field">
                  <span>{copy.language}</span>
                  <select value={language} onChange={(event) => updateLanguage(event.target.value as Language)}>
                    {Object.entries(languageLabels).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="language-field compact-language-field">
                  <span>Theme</span>
                  <select value={theme} onChange={(event) => updateTheme(event.target.value as Theme)}>
                    {Object.entries(themeLabels).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : page !== 'lessons' ? (
              <button className="nav-button" type="button" onClick={() => goToPage('lessons')}>
                {copy.lessons}
              </button>
            ) : null}
          </div>
        </div>

        {toolProgress && (
          <div className="tool-progress" aria-label={`${toolProgress.label} progress`}>
            <div className="tool-progress-meta">
              <span>{toolProgress.label}</span>
              <span>{toolProgress.detail}</span>
            </div>
            <div
              className="tool-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(toolProgress.percent)}
            >
              <span style={{ width: `${Math.min(Math.max(toolProgress.percent, 0), 100)}%` }} />
            </div>
          </div>
        )}

        {page === 'starter' ? (
          <section className="starter-page" aria-label="Study Helper introduction">
            <div className="starter-copy">
              <p className="starter-kicker">Study smarter with your own materials</p>
              <h2>Turn lessons into summaries, quizzes, flashcards, and practice chats.</h2>
              <p>
                Save your notes, review weak lessons, grow your streak pet, and use focused study tools from one place.
              </p>
              <div className="starter-actions">
                <button className="starter-primary" type="button" onClick={() => goToPage('study')}>
                  Start studying
                </button>
                <button className="starter-secondary" type="button" onClick={() => goToPage('otherMaterials')}>
                  Find materials
                </button>
              </div>
            </div>

            <div className="starter-visual" aria-hidden="true">
              <div className="starter-phone">
                <div className="starter-phone-top" />
                <img src="/pets/gold/bunny.png" alt="" />
                <div className="starter-phone-lines">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="starter-floating-card card-one">
                <strong>6</strong>
                <span>saved lessons</span>
              </div>
              <div className="starter-floating-card card-two">
                <strong>25</strong>
                <span>focus minutes</span>
              </div>
              <div className="starter-floating-card card-three">
                <strong>AI</strong>
                <span>tutor chat</span>
              </div>
            </div>

            <div className="starter-stats">
              <div>
                <strong>Summaries</strong>
                <span>quick review from notes</span>
              </div>
              <div>
                <strong>Flashcards</strong>
                <span>practice active recall</span>
              </div>
              <div>
                <strong>Progress</strong>
                <span>track lesson confidence</span>
              </div>
              <div>
                <strong>Pets</strong>
                <span>stay motivated daily</span>
              </div>
            </div>
          </section>
        ) : page === 'otherMaterials' ? (
          <section className="other-materials-page" aria-label="Other materials">
            {isUploadingSharedMaterial ? (
              <div className="share-panel">
                <div className="lessons-page-heading compact-heading">
                  <div>
                    <h2>{copy.otherMaterials}</h2>
                    <p>{copy.shareNotes}</p>
                  </div>
                  <button className="small-button muted-button" type="button" onClick={() => setIsUploadingSharedMaterial(false)}>
                    {copy.cancel}
                  </button>
                </div>

                <div className="share-form">
                  <label className="field">
                    <span>{copy.subject}</span>
                    <input
                      value={sharedSubject}
                      onChange={(event) => setSharedSubject(event.target.value)}
                      placeholder={copy.subject}
                    />
                  </label>
                  <label className="field">
                    <span>{copy.title}</span>
                    <input
                      value={sharedTitle}
                      onChange={(event) => setSharedTitle(event.target.value)}
                      placeholder={copy.title}
                    />
                  </label>
                  <label className="field">
                    <span>{copy.material}</span>
                    <textarea
                      value={sharedText}
                      onChange={(event) => setSharedText(event.target.value)}
                      placeholder={copy.materialPlaceholder}
                    />
                  </label>
                <button className="generate-button" type="button" onClick={uploadSharedMaterial} disabled={isSharedLoading}>
                  {isSharedLoading ? copy.uploading : copy.uploadMaterial}
                </button>
                {sharedError && <p className="message">{sharedError}</p>}
                {sharedNotice && <p className="notice">{sharedNotice}</p>}
              </div>
            </div>
            ) : (
              <div className="browse-panel">
                <div className="browse-heading">
                  <label className="field">
                    <span>{copy.findMaterials}</span>
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={copy.searchPlaceholder}
                      data-tutorial-target="materials-search-box"
                    />
                  </label>
                </div>

                {sharedError && <p className="message">{sharedError}</p>}
                {sharedNotice && <p className="notice">{sharedNotice}</p>}

                <div className="search-results">
                  {searchedSharedMaterials.length === 0 ? (
                    <p className="empty-state large">{copy.noSharedMaterialsFound}</p>
                  ) : (
                    searchedSharedMaterials.map((item) => (
                      <article className="lesson-card-large" key={item.id}>
                        <div className="lesson-copy">
                          <p className="card-label">{item.subject}</p>
                          <h3>{item.title}</h3>
                          <p className="lesson-preview">{makeLessonPreview(item.material)}</p>
                          <p className="lesson-meta">
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            <span>{getWordCount(item.material)} {copy.words}</span>
                          </p>
                        </div>
                        <div className={session?.user.id === item.user_id ? 'lesson-actions two-actions' : 'lesson-actions one-action'}>
                          <button className="small-button" type="button" onClick={() => useSharedMaterial(item)}>
                            {copy.useMaterial}
                          </button>
                          {session?.user.id === item.user_id && (
                            <button
                              className="small-button danger-button"
                              type="button"
                              onClick={() => deleteSharedMaterial(item)}
                              disabled={isSharedLoading}
                            >
                              {copy.delete}
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
                <h2>{copy.yourAccount}</h2>
                <p>{session ? `${copy.signedInAs} ${currentAccountName}.` : copy.signInAccountText}</p>
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
                        {copy.signIn}
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
                        {copy.createAccount}
                      </button>
                    </div>
                    <button className="google-auth-button" type="button" onClick={signInWithGoogle}>
                      <span aria-hidden="true">G</span>
                      {getGoogleSignInLabel(language)}
                    </button>
                    {authMode === 'signUp' && (
                      <label className="field">
                        <span>{copy.name}</span>
                        <input
                          value={accountNameInput}
                          onChange={(event) => setAccountNameInput(event.target.value)}
                          placeholder={copy.typeName}
                        />
                      </label>
                    )}
                    <label className="field">
                      <span>{copy.email}</span>
                      <input
                        type="email"
                        value={accountEmail}
                        onChange={(event) => setAccountEmail(event.target.value)}
                        placeholder="you@example.com"
                      />
                    </label>
                    <label className="field">
                      <span>{copy.password}</span>
                      <div className="password-field">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={accountPassword}
                          onChange={(event) => setAccountPassword(event.target.value)}
                        placeholder={copy.passwordPlaceholder}
                        />
                        <button
                          className="show-password-button"
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? copy.hide : copy.show}
                        >
                          {showPassword ? copy.hide : copy.show}
                        </button>
                      </div>
                    </label>
                    {authMode === 'signUp' && (
                      <ul className="password-rules" aria-label="Password rules">
                        <li className={accountPassword.length >= 8 ? 'met' : ''}>{copy.passwordRule8}</li>
                        <li className={/\d/.test(accountPassword) ? 'met' : ''}>{copy.passwordRuleNumber}</li>
                        <li className={/[A-Z]/.test(accountPassword) ? 'met' : ''}>{copy.passwordRuleCapital}</li>
                      </ul>
                    )}
                    <button className="generate-button" type="button" onClick={submitAccount}>
                      {authMode === 'signUp' ? copy.createAccount : copy.signIn}
                    </button>
                    {accountNotice && <p className="notice">{accountNotice}</p>}
                    {accountError && <p className="message">{accountError}</p>}
                  </div>
                )}
              </div>
              {session && (
                <button className="sign-out-button" type="button" onClick={signOut}>
                  {copy.signOut}
                </button>
              )}
            </div>
            <div className="pet-panel">
              <div
                className={`${isPetHatched ? 'pet-visual hatched' : `pet-visual egg egg-${displayedEggColor}`} ${isPetFrozen ? 'frozen' : ''}`}
                aria-hidden="true"
              >
                {studyPet.petImage ? (
                  <img className="pet-image" src={studyPet.petImage} alt="" />
                ) : isPetHatched ? (
                  getPetFace(studyPet.petType)
                ) : (
                  <span className="egg-core">
                    <span className="egg-spot spot-one" />
                    <span className="egg-spot spot-two" />
                    <span className="egg-spot spot-three" />
                    <span className="egg-spot spot-four" />
                    <span className="egg-spot spot-five" />
                  </span>
                )}
              </div>
              <div className="pet-copy">
                <p className="card-label">{copy.petTitle}</p>
                <h2>{petName}</h2>
                <p>
                  {copy.streak}: {studyPet.streak} {copy.petWarmDays}
                </p>
                <p>
                  {!session
                    ? copy.petSignIn
                    : !studyPet.hasChosenEggColor
                      ? copy.petChooseColor
                    : isPetHatched
                    ? `${copy.petHatched} ${petName}. ${copy.petReady}`
                    : warmDaysLeft > 0
                      ? `${copy.petWarmToday} ${warmDaysShown}/${eggWarmDays} ${copy.petWarmDays}, ${warmDaysLeft} ${copy.petWarmLeft}.`
                      : copy.petSubtitle}
                </p>
                {session && !isPetHatched && !studyPet.hasChosenEggColor && (
                  <div className="egg-color-picker" aria-label="Choose egg color">
                    {eggColors.map((eggColor) => (
                      <button
                        className={displayedEggColor === eggColor ? `egg-color-swatch ${eggColor} active` : `egg-color-swatch ${eggColor}`}
                        key={eggColor}
                        type="button"
                        onClick={() => chooseEggColor(eggColor)}
                        aria-label={eggColorLabels[eggColor]}
                      />
                    ))}
                    <button className="small-button confirm-egg-button" type="button" onClick={confirmEggColor}>
                      {copy.confirmEggColor}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : page === 'lessons' ? (
          <section className="lessons-page" aria-label="All saved lessons">
            <div className="lessons-page-heading">
              <div>
                <h2>{copy.lessons}</h2>
                <p>{savedLessons.length} / {maxSavedLessons} {copy.savedLessonsUsed}</p>
              </div>
            </div>

            {savedLessons.length === 0 ? (
              <p className="empty-state large">{copy.noSavedLessonsYet}</p>
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
                          <span>{getWordCount(lessonMaterial)} {copy.words}</span>
                          <span>{sourceCount} {sourceCount === 1 ? copy.source : copy.sources}</span>
                        </p>
                      </div>

                      {addingSourceId === lesson.id && (
                        <div className="source-form">
                          <textarea
                            value={sourceText}
                            onChange={(event) => setSourceText(event.target.value)}
                            placeholder={copy.pasteSourcePlaceholder}
                          />
                          <div className="source-actions">
                            <button className="small-button" type="button" onClick={() => addSourceToLesson(lesson)}>
                              {copy.addSource}
                            </button>
                            <button className="small-button muted-button" type="button" onClick={cancelAddingSource}>
                              {copy.cancel}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="lesson-actions">
                        <button className="small-button" type="button" onClick={() => loadLesson(lesson)}>
                          {copy.load}
                        </button>
                        <button className="small-button" type="button" onClick={() => startAddingSource(lesson.id)}>
                          {copy.addAnotherSource}
                        </button>
                        <button className="small-button danger-button" type="button" onClick={() => deleteLesson(lesson.id)}>
                          {copy.delete}
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
                  <p className="card-label">{message.role === 'user' ? copy.you : copy.tutor}</p>
                  <p>{message.text}</p>
                </article>
              ))}
              {isTutorLoading && (
                <article className="tutor-message tutor">
                  <p className="card-label">{copy.tutor}</p>
                  <p>{copy.thinking}</p>
                </article>
              )}
            </div>

            <div className="tutor-input-panel">
              <label className="tutor-composer">
                <textarea
                  value={tutorQuestion}
                  onChange={(event) => setTutorQuestion(event.target.value)}
                  placeholder={copy.askTutorPlaceholder}
                />
                <button className="generate-button" type="button" onClick={askTutor} disabled={isTutorLoading}>
                  {isTutorLoading ? copy.thinking : copy.askTutor}
                </button>
              </label>
              {tutorError && <p className="message">{tutorError}</p>}
            </div>
          </section>
        ) : page === 'flashcards' ? (
          <section className="flashcards-page" aria-label="Flashcards page">
            <div className="lessons-page-heading">
              <div>
                <h2>{copy.flashcards}</h2>
                <p>{flashcards.length} {copy.cardsReady}</p>
              </div>
              <button className="small-button" type="button" onClick={() => goToPage('study')}>
                {copy.backToStudy}
              </button>
            </div>

            {notice && <p className="notice page-notice">{notice}</p>}

            {flashcards.length === 0 ? (
              <p className="empty-state large">{copy.noFlashcardsYet}</p>
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
                  <span className="card-label">{isFlashcardFlipped ? copy.back : copy.front}</span>
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
                <h2>{copy.quiz}</h2>
                <p>{quiz.length} {copy.questionsReady}</p>
              </div>
              <button className="small-button" type="button" onClick={() => goToPage('study')}>
                {copy.backToStudy}
              </button>
            </div>

            {notice && <p className="notice page-notice">{notice}</p>}

            {quiz.length === 0 ? (
              <p className="empty-state large">{copy.noQuizYet}</p>
            ) : (
              <div className="quiz-page-body">
                <div className="result-heading">
                  <h2>{copy.quiz}</h2>
                  <p className="quiz-status">{isQuizSubmitted ? copy.submitted : copy.notSubmittedYet}</p>
                </div>

                <div className="quiz-list">
                  {quiz.map((item, index) => (
                    <article className="quiz-item" key={`${item.question}-${index}`}>
                      <p className="quiz-area-tag">{normalizeQuizArea(item.area, item.question)}</p>
                      <label>
                        <span>{index + 1}. {item.question}</span>
                        <input
                          value={quizAnswers[index] ?? ''}
                          onChange={(event) => {
                            const nextAnswers = [...quizAnswers];
                            nextAnswers[index] = event.target.value;
                            setQuizAnswers(nextAnswers);
                            setQuizGrades([]);
                            setIsQuizSubmitted(false);
                            setShowQuizAnswers(false);
                            setQuizError('');
                          }}
                          placeholder={copy.answerPlaceholder}
                        />
                      </label>
                      {showQuizAnswers && quizGrades[index] && (
                        <p className={quizGrades[index].correct ? 'answer correct-answer' : 'answer wrong-answer'}>
                          {quizGrades[index].correct ? copy.correct : copy.notQuite}: {quizGrades[index].feedback}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
                {quizError && <p className="message">{quizError}</p>}
                <button className="generate-button quiz-submit-button" type="button" onClick={submitQuiz} disabled={isQuizChecking}>
                  {isQuizChecking ? copy.checking : copy.submitAnswers}
                </button>
              </div>
            )}
          </section>
        ) : page === 'leaderboard' ? (
          <section className="leaderboard-page" aria-label="Leaderboard page">
            <article className="leaderboard-hero">
              <div>
                <p className="card-label">{copy.leaderboard}</p>
                <h2>Top XP learners</h2>
                <p>XP comes from real learning tasks, so deeper studying ranks higher than quick streak farming.</p>
              </div>
              <div className="leaderboard-current-rank">
                <img src={streakFlameSrc} alt="" />
                <div>
                  <span>Your rank</span>
                  <strong>{currentLeaderboardRank > 0 ? `#${currentLeaderboardRank}` : '-'}</strong>
                </div>
              </div>
              <div className="leaderboard-current-rank xp-rank">
                <div>
                  <span>Your XP</span>
                  <strong>{learningXp.totalXp}</strong>
                </div>
              </div>
              <button className="small-button" type="button" onClick={() => void refreshLeaderboard()} disabled={isLeaderboardLoading}>
                {isLeaderboardLoading ? 'Loading...' : 'Refresh'}
              </button>
            </article>

            {leaderboardError && <p className="message">{leaderboardError}</p>}
            {!session && <p className="notice">Sign in and study to appear on the leaderboard.</p>}

            <section className="xp-task-panel" aria-label="Daily XP tasks">
              <div className="xp-task-heading">
                <div>
                  <p className="card-label">Daily XP tasks</p>
                  <h3>{todayCompletedTaskKeys.length} / {learningTaskDefinitions.length} complete</h3>
                  <p>{dailyTaskXp} XP earned today. Tasks reset tomorrow, total XP stays.</p>
                </div>
                <div className="xp-task-total">
                  <span>Total XP</span>
                  <strong>{learningXp.totalXp}</strong>
                </div>
              </div>

              <div className="xp-task-grid">
                {learningTaskDefinitions.map((task) => {
                  const isComplete = completedTaskKeySet.has(getLearningTaskKey(task.id));

                  return (
                    <article className={isComplete ? 'xp-task complete' : 'xp-task'} key={task.id}>
                      <span className="xp-task-pill">{isComplete ? 'Done' : `+${task.xp} XP`}</span>
                      <div>
                        <strong>{task.title}</strong>
                        <p>{task.detail}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <div className="leaderboard-list">
              {leaderboardRows.length === 0 && !isLeaderboardLoading ? (
                <p className="empty-state large">No leaderboard entries yet.</p>
              ) : (
                leaderboardRows.map((row, index) => {
                  const isCurrentUser = row.user_id === session?.user.id;
                  const lastStudyLabel = row.last_study_date
                    ? new Date(`${row.last_study_date}T00:00:00`).toLocaleDateString()
                    : 'No study date';

                  return (
                    <article className={isCurrentUser ? 'leaderboard-row current-user' : 'leaderboard-row'} key={row.user_id}>
                      <span className="leaderboard-rank">#{index + 1}</span>
                      <div className="leaderboard-student">
                        <strong>{row.display_name}</strong>
                        <span>{lastStudyLabel} - {row.completed_tasks ?? 0} tasks completed</span>
                      </div>
                      <div className="leaderboard-score">
                        <strong>{row.xp ?? 0}</strong>
                        <span>XP</span>
                        <small>{row.streak} {row.streak === 1 ? 'day' : 'days'} streak</small>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ) : page === 'progress' ? (
          <section className="progress-page" aria-label="Progress page">
            <article className="progress-card main-progress-card">
              <p className="card-label">Study streak</p>
              <h2>{studyPet.streak} days</h2>
              <p>
                {!session
                  ? 'Sign in to grow your streak and hatch your pet.'
                  : isPetHatched
                    ? `${petName} is hatched and ready to study with you.`
                    : `${warmDaysShown}/${eggWarmDays} warm days before the egg hatches.`}
              </p>
              <div className="progress-card-track" aria-hidden="true">
                <span style={{ width: `${Math.min(Math.max(streakPercent, 0), 100)}%` }} />
              </div>
            </article>

            {savedLessons.length > 0 && (
              <article className="progress-card lesson-rings-card">
                <div>
                  <p className="card-label">{copy.lessons}</p>
                  <h3>{savedLessons.length} / {maxSavedLessons}</h3>
                  <p>Knowledge rings for your saved lesson slots</p>
                </div>
                <div className="lesson-ring-grid" aria-label="Saved lesson knowledge progress">
                  {lessonRingSlots.map((lesson, index) => {
                    const percent = lesson ? getLessonKnowledgePercent(lesson) : 0;
                    const ringStyle: LessonRingStyle = { '--lesson-progress': `${percent}%` };

                    return (
                      <div className={lesson ? 'lesson-ring-slot filled' : 'lesson-ring-slot'} key={lesson?.id ?? `empty-${index}`}>
                        <div className="lesson-ring" style={ringStyle}>
                          <span>{percent}%</span>
                        </div>
                        <p>{lesson ? lesson.title : `Lesson ${index + 1}`}</p>
                      </div>
                    );
                  })}
                </div>
              </article>
            )}

            {knowledgeStats.length > 0 && (
              <article className="progress-card knowledge-map-card">
                <div>
                  <p className="card-label">Question areas</p>
                  <h3>{knowledgeStats.reduce((total, stat) => total + stat.mistakes, 0)} mistakes</h3>
                  <p>AI uses this to focus future quizzes and tutoring.</p>
                </div>
                <div className="knowledge-area-list">
                  {weakKnowledgeStats.map((stat) => {
                    const accuracy = stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : 0;

                    return (
                      <div className="knowledge-area-row" key={stat.area}>
                        <div>
                          <strong>{stat.area}</strong>
                          <span>{stat.mistakes} mistakes · {stat.correct}/{stat.attempts} correct</span>
                        </div>
                        <b>{accuracy}%</b>
                      </div>
                    );
                  })}
                </div>
              </article>
            )}

            <article className="progress-card">
              <p className="card-label">{copy.flashcards}</p>
              <h3>{flashcards.length > 0 ? `${currentFlashcardIndex + 1} / ${flashcards.length}` : '0 / 0'}</h3>
              <p>Current flashcard set</p>
              <div className="progress-card-track" aria-hidden="true">
                <span style={{ width: `${Math.min(Math.max(flashcardPercent, 0), 100)}%` }} />
              </div>
            </article>

            <article className="progress-card">
              <p className="card-label">{copy.quiz}</p>
              <h3>{quiz.length > 0 ? `${answeredQuizCount} / ${quiz.length}` : '0 / 0'}</h3>
              <p>Answers filled in</p>
              <div className="progress-card-track" aria-hidden="true">
                <span style={{ width: `${Math.min(Math.max(quizPercent, 0), 100)}%` }} />
              </div>
            </article>

            <article className="progress-card">
              <p className="card-label">Focus Timer</p>
              <h3>{Math.round(timerPercent)}%</h3>
              <p>{timerMode === 'focus' ? 'Focus session' : 'Break session'}</p>
              <div className="progress-card-track" aria-hidden="true">
                <span style={{ width: `${Math.min(Math.max(timerPercent, 0), 100)}%` }} />
              </div>
            </article>
          </section>
        ) : page === 'notes' ? (
          <section className="notes-page" aria-label="Notes page">
            <div className="notes-editor-panel">
              <div className="notes-panel-heading">
                <div>
                  <p className="card-label">{copy.notes}</p>
                  <h2>{activeNoteId ? 'Edit note' : 'New note'}</h2>
                </div>
                <div className="notes-heading-actions">
                  <button className="small-button" type="button" onClick={() => setIsSavedNotesOpen(true)}>
                    Saved notes
                  </button>
                  <button className="small-button muted-button notes-new-button" type="button" onClick={startNewNote}>
                    New note
                  </button>
                </div>
              </div>

              <label className="field">
                <span>Title</span>
                <input
                  value={noteTitle}
                  onChange={(event) => setNoteTitle(event.target.value)}
                  placeholder="Example: Chemistry review"
                />
              </label>

              <div className="freehand-toolbar" aria-label="Freehand note tools">
                <div className="note-color-row" aria-label="Pen color">
                  {['#142126', '#2f6f73', '#5e6ad2', '#b84444', '#f7f8f8'].map((color) => (
                    <button
                      className={notePenColor === color ? 'note-color-swatch active' : 'note-color-swatch'}
                      key={color}
                      type="button"
                      style={{ background: color }}
                      onClick={() => setNotePenColor(color)}
                      aria-label={`Use pen color ${color}`}
                    />
                  ))}
                </div>
                <label className="note-size-control">
                  <span>Pen size</span>
                  <input
                    min="2"
                    max="24"
                    type="range"
                    value={notePenSize}
                    onChange={(event) => setNotePenSize(Number(event.target.value))}
                  />
                  <strong>{notePenSize}</strong>
                </label>
                <button className="small-button muted-button" type="button" onClick={clearStudyNoteCanvas}>
                  Clear
                </button>
              </div>

              <div className="freehand-canvas-wrap">
                <canvas
                  ref={noteCanvasRef}
                  width={noteCanvasWidth}
                  height={noteCanvasHeight}
                  onPointerDown={startNoteDrawing}
                  onPointerMove={continueNoteDrawing}
                  onPointerUp={stopNoteDrawing}
                  onPointerCancel={stopNoteDrawing}
                  onPointerLeave={stopNoteDrawing}
                  aria-label="Freehand note canvas"
                />
              </div>

              <div className="notes-meta-row">
                <span>{isNoteDirty ? 'Unsaved changes' : 'Ready'}</span>
                <span>{savedNotes.length} / {maxSavedNotes} saved</span>
              </div>

              <div className="action-row notes-action-row">
                <button className="generate-button" type="button" onClick={saveStudyNote}>
                  Save freehand note
                </button>
              </div>

              {notesError && <p className="message">{notesError}</p>}
              {notesNotice && <p className="notice">{notesNotice}</p>}
            </div>
          </section>
        ) : page === 'focusTimer' ? (
          <section className="focus-timer-page" aria-label="Focus timer">
            <div className="timer-panel">
              <p className="card-label">Focus Timer</p>
              <div className="timer-display" aria-live="polite">
                {formatTimerTime(timerSecondsLeft)}
              </div>
              <p className="timer-hint">Use a quiet timer to stay on one task.</p>

              <div className="timer-settings" aria-label="Timer lengths">
                <label>
                  <span>Focus minutes</span>
                  <input
                    min="1"
                    max="180"
                    type="number"
                    value={focusMinutes}
                    onChange={(event) => updateTimerMinutes('focus', Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Break minutes</span>
                  <input
                    min="1"
                    max="180"
                    type="number"
                    value={breakMinutes}
                    onChange={(event) => updateTimerMinutes('break', Number(event.target.value))}
                  />
                </label>
              </div>

              <div className="timer-mode-row" aria-label="Timer mode">
                <button
                  className={timerMode === 'focus' ? 'timer-mode-button active' : 'timer-mode-button'}
                  type="button"
                  onClick={() => chooseTimerMode('focus')}
                >
                  Focus
                </button>
                <button
                  className={timerMode === 'break' ? 'timer-mode-button active' : 'timer-mode-button'}
                  type="button"
                  onClick={() => chooseTimerMode('break')}
                >
                  Break
                </button>
              </div>

              <div className="timer-actions">
                <button className="generate-button" type="button" onClick={() => setIsTimerRunning(!isTimerRunning)}>
                  {isTimerRunning ? 'Pause' : 'Start'}
                </button>
                <button className="small-button muted-button" type="button" onClick={resetTimer}>
                  Reset
                </button>
              </div>
            </div>
          </section>
        ) : page === 'calculator' ? (
          <section className="calculator-page" aria-label="Calculator">
            <div className="calculator-panel">
              <div className="calculator-display" aria-live="polite">
                <span>{calculatorOperator ?? ''}</span>
                <strong>{calculatorDisplay}</strong>
              </div>
              <div className="calculator-science-grid" aria-label="Scientific calculator functions">
                <button className="calculator-key scientific" type="button" onClick={() => applyCalculatorFunction('square')}>
                  x²
                </button>
                <button className="calculator-key scientific" type="button" onClick={() => applyCalculatorFunction('sqrt')}>
                  √x
                </button>
                <button className="calculator-key scientific" type="button" onClick={() => chooseCalculatorOperator('^')}>
                  xʸ
                </button>
                <button className="calculator-key scientific" type="button" onClick={() => inputCalculatorConstant(Math.PI)}>
                  π
                </button>
                <button className="calculator-key scientific" type="button" onClick={() => inputCalculatorConstant(Math.E)}>
                  e
                </button>
                <button className="calculator-key scientific" type="button" onClick={() => applyCalculatorFunction('sin')}>
                  sin
                </button>
                <button className="calculator-key scientific" type="button" onClick={() => applyCalculatorFunction('cos')}>
                  cos
                </button>
                <button className="calculator-key scientific" type="button" onClick={() => applyCalculatorFunction('tan')}>
                  tan
                </button>
                <button className="calculator-key scientific" type="button" onClick={() => applyCalculatorFunction('log')}>
                  log
                </button>
                <button className="calculator-key scientific" type="button" onClick={() => applyCalculatorFunction('ln')}>
                  ln
                </button>
                <button className="calculator-key scientific" type="button" onClick={() => applyCalculatorFunction('percent')}>
                  %
                </button>
              </div>
              <div className="calculator-grid">
                <button className="calculator-key muted" type="button" onClick={clearCalculator}>
                  AC
                </button>
                <button className="calculator-key muted" type="button" onClick={deleteCalculatorDigit}>
                  Del
                </button>
                <button className="calculator-key muted" type="button" onClick={toggleCalculatorSign}>
                  +/-
                </button>
                <button className="calculator-key operator" type="button" onClick={() => chooseCalculatorOperator('/')}>
                  ÷
                </button>
                {['7', '8', '9'].map((digit) => (
                  <button className="calculator-key" key={digit} type="button" onClick={() => inputCalculatorDigit(digit)}>
                    {digit}
                  </button>
                ))}
                <button className="calculator-key operator" type="button" onClick={() => chooseCalculatorOperator('*')}>
                  ×
                </button>
                {['4', '5', '6'].map((digit) => (
                  <button className="calculator-key" key={digit} type="button" onClick={() => inputCalculatorDigit(digit)}>
                    {digit}
                  </button>
                ))}
                <button className="calculator-key operator" type="button" onClick={() => chooseCalculatorOperator('-')}>
                  -
                </button>
                {['1', '2', '3'].map((digit) => (
                  <button className="calculator-key" key={digit} type="button" onClick={() => inputCalculatorDigit(digit)}>
                    {digit}
                  </button>
                ))}
                <button className="calculator-key operator" type="button" onClick={() => chooseCalculatorOperator('+')}>
                  +
                </button>
                <button className="calculator-key zero" type="button" onClick={() => inputCalculatorDigit('0')}>
                  0
                </button>
                <button className="calculator-key" type="button" onClick={inputCalculatorDecimal}>
                  .
                </button>
                <button className="calculator-key equals" type="button" onClick={completeCalculator}>
                  =
                </button>
              </div>
            </div>
          </section>
        ) : page === 'calendar' ? (
          <section className="calendar-page" aria-label={copy.calendar}>
            <div className="calendar-panel">
              <div className="calendar-heading">
                <div>
                  <p className="card-label">{copy.calendar}</p>
                  <h2>{getCalendarMonthLabel(calendarMonth)}</h2>
                </div>
                <div className="calendar-actions">
                  <button className="small-button calendar-add-button" type="button" onClick={openCalendarEventForm} aria-label="Add calendar event">
                    +
                  </button>
                  <button className="small-button muted-button" type="button" onClick={() => moveCalendarMonth(-1)}>
                    Prev
                  </button>
                  <button className="small-button" type="button" onClick={showCalendarToday}>
                    Today
                  </button>
                  <button className="small-button muted-button" type="button" onClick={() => moveCalendarMonth(1)}>
                    Next
                  </button>
                </div>
              </div>

              <div className="calendar-grid" aria-label={`${getCalendarMonthLabel(calendarMonth)} calendar`}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
                  <span className="calendar-weekday" key={dayName}>
                    {dayName}
                  </span>
                ))}
                {calendarCells.map((date, index) => {
                  if (!date) {
                    return <span className="calendar-empty-day" key={`empty-${index}`} />;
                  }

                  const dateKey = getCalendarDateKey(date);
                  const dayEvents = calendarEventsByDate.get(dateKey) ?? [];
                  const isToday = dateKey === calendarTodayKey;
                  const isSelected = dateKey === selectedCalendarDate;

                  return (
                    <button
                      className={[
                        'calendar-day',
                        isToday ? 'today' : '',
                        isSelected ? 'selected' : '',
                        dayEvents.length ? 'has-events' : '',
                      ].filter(Boolean).join(' ')}
                      key={dateKey}
                      type="button"
                      onClick={() => setSelectedCalendarDate(dateKey)}
                      aria-label={`${date.toLocaleDateString()}${dayEvents.length ? `, ${dayEvents.length} activity items` : ''}`}
                    >
                      <span>{date.getDate()}</span>
                      {dayEvents.length > 0 && (
                        <span className="calendar-event-dots" aria-hidden="true">
                          {dayEvents.slice(0, 4).map((event, eventIndex) => (
                            <i className={`calendar-dot ${event.type}`} key={`${event.type}-${eventIndex}`} />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <aside className="calendar-detail-panel">
              <p className="card-label">Selected day</p>
              <h3>{selectedCalendarDateLabel}</h3>
              {selectedCalendarEvents.length === 0 ? (
                <p>No study activity saved for this day.</p>
              ) : (
                <div className="calendar-event-list">
                  {selectedCalendarEvents.map((event, index) => (
                    <article className="calendar-event-item" key={`${event.type}-${event.detail}-${index}`}>
                      <div className="calendar-event-top">
                        <span className={`calendar-event-type ${event.type}`}>{event.label}</span>
                        {event.type === 'intervaling' && event.planId && (
                          <button
                            className="small-button muted-button calendar-delete-button"
                            type="button"
                            onClick={() => deleteIntervalingPlan(event.planId ?? '')}
                          >
                            Delete
                          </button>
                        )}
                        {event.type === 'custom' && event.customEventId && (
                          <button
                            className="small-button muted-button calendar-delete-button"
                            type="button"
                            onClick={() => deleteCustomCalendarEvent(event.customEventId ?? '')}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <strong>{event.detail}</strong>
                    </article>
                  ))}
                </div>
              )}
            </aside>
          </section>
        ) : page === 'studyMethods' ? (
          <section className="study-methods-page" aria-label="Study methods">
            <button className="study-method-tile" type="button" onClick={() => setIsPomodoroInfoOpen(true)}>
              <strong>
                Pomodoro <span aria-hidden="true">🍅</span>
              </strong>
            </button>
            <button className="study-method-tile" type="button" onClick={() => setIsTeachInfoOpen(true)}>
              <strong>Teach Somebody</strong>
            </button>
            <button className="study-method-tile" type="button" onClick={() => setIsBlurtingInfoOpen(true)}>
              <strong>Blurting</strong>
            </button>
            <button className="study-method-tile intervaling-tile" type="button" onClick={() => setIsIntervalingInfoOpen(true)}>
              <strong>Intervaling</strong>
              <span className="method-subtitle">1 day study, 1 day off</span>
            </button>
          </section>
        ) : (
          <>
            <div className={isOptionsOpen ? 'workspace' : 'workspace options-closed'}>
              <aside className={isOptionsOpen ? 'study-options' : 'study-options collapsed'} aria-label="Study options">
                <div className="options-heading">
                  <h2>{copy.options}</h2>
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
                        {copy[item.labelKey]}
                      </button>
                    ))}
                  </div>
                )}
              </aside>

              <div className="editor-panel">
                <label className="field lesson-name-field">
                  <span>{copy.lessonName}</span>
                  <input
                    value={lessonName}
                    onChange={(event) => setLessonName(event.target.value)}
                    placeholder={copy.exampleLesson}
                  />
                </label>

                {mode === 'quiz' && (
                  <label className="field quiz-count-field">
                    <span>How many questions?</span>
                    <input
                      min="1"
                      max="20"
                      type="number"
                      value={quizQuestionCount}
                      onChange={(event) => setQuizQuestionCount(Math.min(20, Math.max(1, Number(event.target.value) || 1)))}
                    />
                  </label>
                )}

                <label className="field">
                  <span>{copy.studyMaterial}</span>
                  <textarea
                    ref={materialTextareaRef}
                    value={material}
                    onChange={(event) => setMaterial(event.target.value)}
                    placeholder={copy.pasteMaterialFirst}
                    data-tutorial-target="material-box"
                  />
                </label>

                <div className="action-row">
                  <button className="generate-button" type="button" onClick={generateStudyHelp} disabled={isLoading}>
                    {getButtonLabel(mode, isLoading, copy)}
                  </button>
                  <button className="save-button" type="button" onClick={saveLesson}>
                    {copy.saveLesson}
                  </button>
                </div>

                {error && <p className="message">{error}</p>}
                {notice && <p className="notice">{notice}</p>}
              </div>
            </div>

          </>
      )}
      </section>

      {isTutorialPromptOpen && (
        <section className="tutorial-prompt-card" role="dialog" aria-label="Tutorial prompt">
          <div>
            <p className="card-label">Quick tour</p>
            <h2>Need a quick tutorial?</h2>
          </div>
          <p>
            I can point to the important parts of Study Helper in about 1 minute. You can still click, type, and test
            the page while it is open.
          </p>
          <div className="tutorial-actions">
            <button className="small-button muted-button" type="button" onClick={skipTutorial}>
              No thanks
            </button>
            <button className="generate-button" type="button" onClick={startTutorial}>
              Yes, show me
            </button>
          </div>
        </section>
      )}

      {isTutorialTourOpen && tutorialStep && (
        <div className="tutorial-tour-layer" role="presentation">
          {tutorialTargetRect && (
            <>
              <div
                className="tutorial-target-halo"
                style={{
                  top: tutorialTargetRect.top - 7,
                  left: tutorialTargetRect.left - 7,
                  width: tutorialTargetRect.width + 14,
                  height: tutorialTargetRect.height + 14,
                }}
                aria-hidden="true"
              />
              <div
                className="tutorial-arrow"
                style={tutorialArrowStyle}
                aria-hidden="true"
              />
            </>
          )}

          <section
            className={`tutorial-popover ${tutorialStep.placement}`}
            style={tutorialPopoverStyle}
            role="dialog"
            aria-label="Study Helper tutorial"
          >
            <div className="tutorial-popover-heading">
              <div>
                <p className="card-label">
                  Step {tutorialStepIndex + 1} of {tutorialSteps.length}
                </p>
                <h2>{tutorialStep.title}</h2>
              </div>
              <button className="small-button muted-button" type="button" onClick={closeTutorial}>
                Close
              </button>
            </div>

            <p>{tutorialStep.body}</p>

            <div className="tutorial-progress" aria-label="Tutorial progress">
              {tutorialSteps.map((step, index) => (
                <button
                  className={index === tutorialStepIndex ? 'active' : ''}
                  key={step.title}
                  type="button"
                  onClick={() => goToTutorialStep(index)}
                  aria-label={`Go to tutorial step ${index + 1}`}
                />
              ))}
            </div>
            <div className="tutorial-actions">
              <button
                className="small-button muted-button"
                type="button"
                onClick={() => goToTutorialStep(tutorialStepIndex - 1)}
                disabled={tutorialStepIndex === 0}
              >
                Back
              </button>
              <button className="generate-button" type="button" onClick={nextTutorialStep}>
                {tutorialStepIndex >= tutorialSteps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </section>
        </div>
      )}

      {quizKeyboardCheck && (
        <div className="summary-modal-backdrop" role="presentation">
          <section className="summary-modal keyboard-check-modal" role="dialog" aria-modal="true" aria-label="Quiz keyboard check">
            <div className="summary-modal-heading">
              <h2>Quiz keyboard check</h2>
              <button className="small-button" type="button" onClick={() => setQuizKeyboardCheck(null)}>
                Close
              </button>
            </div>
            <p>
              These notes seem to include {quizKeyboardCheck.languageName}. Do you have that language keyboard on this
              device?
            </p>
            <div className="keyboard-choice-actions">
              <button className="save-button" type="button" onClick={() => void answerQuizKeyboardCheck('hasKeyboard')}>
                Yes, I have it
              </button>
              <button className="generate-button" type="button" onClick={() => void answerQuizKeyboardCheck('englishAnswers')}>
                No, use English answers
              </button>
            </div>
          </section>
        </div>
      )}

      {isSavedNotesOpen && (
        <div className="summary-modal-backdrop" role="presentation">
          <section className="summary-modal saved-notes-modal" role="dialog" aria-modal="true" aria-label="Saved notes">
            <div className="summary-modal-heading">
              <div>
                <p className="card-label">Saved</p>
                <h2>Your notes</h2>
              </div>
              <div className="notes-heading-actions">
                <span className="notes-count-pill">{savedNotes.length}</span>
                <button className="small-button" type="button" onClick={() => setIsSavedNotesOpen(false)}>
                  Close
                </button>
              </div>
            </div>

            {savedNotes.length === 0 ? (
              <p className="empty-state large">No notes saved yet.</p>
            ) : (
              <div className="notes-list saved-notes-modal-list">
                {savedNotes.map((note) => (
                  <article className={note.id === activeNoteId ? 'note-card active' : 'note-card'} key={note.id}>
                    <button
                      className="note-card-main"
                      type="button"
                      onClick={() => {
                        openStudyNote(note);
                        setIsSavedNotesOpen(false);
                      }}
                    >
                      <span className="note-preview">
                        {note.imageData ? (
                          <img src={note.imageData} alt="" />
                        ) : (
                          <span>{note.body?.slice(0, 80) || 'Freehand note'}</span>
                        )}
                      </span>
                      <span className="note-card-top">
                        <strong>{note.title}</strong>
                        <time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleDateString()}</time>
                      </span>
                      <span className="note-card-word-count">
                        {note.imageData ? 'Freehand' : `${getWordCount(note.body ?? '')} ${copy.words}`}
                      </span>
                    </button>
                    <div className="note-card-actions">
                      <button
                        className="small-button"
                        type="button"
                        onClick={() => {
                          openStudyNote(note);
                          setIsSavedNotesOpen(false);
                        }}
                      >
                        Open
                      </button>
                      <button className="small-button muted-button" type="button" onClick={() => deleteStudyNote(note.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {isCalendarEventFormOpen && (
        <div className="summary-modal-backdrop" role="presentation">
          <section className="summary-modal calendar-event-modal" role="dialog" aria-modal="true" aria-label="Add calendar event">
            <div className="summary-modal-heading">
              <h2>Add event</h2>
              <button className="small-button" type="button" onClick={() => setIsCalendarEventFormOpen(false)}>
                Close
              </button>
            </div>
            <div className="calendar-event-form">
              <label className="field">
                <span>Date</span>
                <input
                  type="date"
                  value={calendarEventDate}
                  onChange={(event) => {
                    setCalendarEventDate(event.target.value);
                    setCalendarEventError('');
                  }}
                />
              </label>
              <label className="field">
                <span>Title</span>
                <input
                  value={calendarEventTitle}
                  onChange={(event) => {
                    setCalendarEventTitle(event.target.value);
                    setCalendarEventError('');
                  }}
                  placeholder="Study biology chapter"
                />
              </label>
              <label className="field">
                <span>Note</span>
                <textarea
                  className="calendar-event-note"
                  value={calendarEventNote}
                  onChange={(event) => setCalendarEventNote(event.target.value)}
                  placeholder="Optional details..."
                />
              </label>
              <button className="generate-button" type="button" onClick={saveCustomCalendarEvent}>
                Save event
              </button>
              {calendarEventError && <p className="message">{calendarEventError}</p>}
            </div>
          </section>
        </div>
      )}

      {summary && (
        <div className="summary-modal-backdrop" role="presentation">
          <section className="summary-modal" role="dialog" aria-modal="true" aria-label={copy.quickSummary}>
            <div className="summary-modal-heading">
              <h2>{copy.quickSummary}</h2>
              <button
                className="small-button"
                type="button"
                onClick={() => {
                  setSummary('');
                  setIsSummaryCopied(false);
                }}
              >
                Close
              </button>
            </div>
            <pre>{summary}</pre>
            <button
              className={isSummaryCopied ? 'generate-button summary-copy-button copied' : 'generate-button summary-copy-button'}
              type="button"
              onClick={copySummaryToClipboard}
            >
              {isSummaryCopied ? '✓ Copied' : 'Copy'}
            </button>
          </section>
        </div>
      )}

      {isPomodoroInfoOpen && (
        <div className="summary-modal-backdrop" role="presentation">
          <section className="summary-modal study-method-modal" role="dialog" aria-modal="true" aria-label="Pomodoro method">
            <div className="summary-modal-heading">
              <h2>🍅 Pomodoro</h2>
              <button
                className="small-button"
                type="button"
                onClick={() => {
                  setIsPomodoroInfoOpen(false);
                  setIsPomodoroSetupOpen(false);
                }}
              >
                Close
              </button>
            </div>
            <div className="study-method-modal-copy">
              {!isPomodoroSetupOpen ? (
                <>
                  <p>
                    Pomodoro helps you focus by studying in short timed sessions, then resting before your brain gets too tired.
                  </p>
                  <ol>
                    <li>Choose one task to study.</li>
                    <li>Set a 25 minute focus timer.</li>
                    <li>Work only on that task until the timer ends.</li>
                    <li>Take a 5 minute break.</li>
                    <li>After 4 rounds, take a longer break.</li>
                  </ol>
                  <button className="generate-button pomodoro-use-button" type="button" onClick={() => setIsPomodoroSetupOpen(true)}>
                    Use it
                  </button>
                </>
              ) : (
                <>
                  <label className="field pomodoro-field">
                    <span>How long do you want to study?</span>
                    <input
                      min="25"
                      max="480"
                      type="number"
                      value={pomodoroStudyMinutes}
                      onChange={(event) => setPomodoroStudyMinutes(event.target.value)}
                    />
                  </label>
                  <div className="pomodoro-plan">
                    <div>
                      <strong>{pomodoroFocusSessions}</strong>
                      <span>focus rounds</span>
                    </div>
                    <div>
                      <strong>{pomodoroShortBreaks}</strong>
                      <span>short breaks</span>
                    </div>
                    <div>
                      <strong>{pomodoroLongBreaks}</strong>
                      <span>long breaks</span>
                    </div>
                  </div>
                  <p>
                    Plan: {pomodoroFocusSessions} rounds of 25 minutes, {pomodoroShortBreaks} short breaks of 5 minutes,
                    and {pomodoroLongBreaks} long breaks of 15 minutes. Total break time: {pomodoroBreakMinutes} minutes.
                  </p>
                  <button className="generate-button pomodoro-use-button" type="button" onClick={startPomodoroPlan}>
                    Start with Focus Timer
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {isTeachInfoOpen && (
        <div className="summary-modal-backdrop" role="presentation">
          <section className="summary-modal study-method-modal" role="dialog" aria-modal="true" aria-label="Teach Somebody method">
            <div className="summary-modal-heading">
              <h2>Teach Somebody</h2>
              <button className="small-button" type="button" onClick={() => setIsTeachInfoOpen(false)}>
                Close
              </button>
            </div>
            <div className="study-method-modal-copy">
              <p>
                This method helps you understand a topic better by explaining it out loud. If you can teach it clearly,
                you probably understand it.
              </p>
              <ol>
                <li>Pick the topic you want to practice.</li>
                <li>Explain it to your pet in simple words.</li>
                <li>Your pet will ask basic questions.</li>
                <li>Answer in detail until the idea feels clear.</li>
              </ol>
              <button className="generate-button pomodoro-use-button" type="button" onClick={startTeachPetChat}>
                Use it
              </button>
            </div>
          </section>
        </div>
      )}

      {isBlurtingInfoOpen && (
        <div className="summary-modal-backdrop" role="presentation">
          <section className="summary-modal study-method-modal" role="dialog" aria-modal="true" aria-label="Blurting method">
            <div className="summary-modal-heading">
              <h2>Blurting</h2>
              <button className="small-button" type="button" onClick={() => setIsBlurtingInfoOpen(false)}>
                Close
              </button>
            </div>
            <div className="study-method-modal-copy">
              <p>
                Blurting helps you find what you actually remember. Put your notes away, write everything you can from memory,
                then compare it with the real notes and fix what you missed.
              </p>
              <ol>
                <li>Choose a topic and hide your notes.</li>
                <li>Write or draw everything you remember without checking.</li>
                <li>Open your notes and mark missing or wrong ideas.</li>
                <li>Repeat later until the gaps get smaller.</li>
              </ol>
              <button
                className="generate-button pomodoro-use-button"
                type="button"
                onClick={startBlurtingPractice}
              >
                Use it
              </button>
            </div>
          </section>
        </div>
      )}

      {isIntervalingInfoOpen && (
        <div className="summary-modal-backdrop" role="presentation">
          <section className="summary-modal study-method-modal intervaling-modal" role="dialog" aria-modal="true" aria-label="Intervaling method">
            <div className="summary-modal-heading">
              <h2>Intervaling</h2>
              <button className="small-button" type="button" onClick={() => setIsIntervalingInfoOpen(false)}>
                Close
              </button>
            </div>
            <div className="study-method-modal-copy">
              <p className="intervaling-intro">
                Intervaling helps you remember material by reviewing it in spaced sessions instead of cramming every day.
                You study, rest for a day, then review again so your brain has to recall the topic.
              </p>
              <div className="intervaling-timeline" aria-label="Intervaling schedule">
                <article className="intervaling-step study-day">
                  <span>Day 1</span>
                  <div>
                    <strong>60 minutes</strong>
                    <p>Study the full material for the first review.</p>
                  </div>
                </article>
                <article className="intervaling-step rest-day">
                  <span>Day 2</span>
                  <div>
                    <strong>Rest</strong>
                    <p>Take one day off from this material.</p>
                  </div>
                </article>
                <article className="intervaling-step study-day">
                  <span>Day 3</span>
                  <div>
                    <strong>30 minutes</strong>
                    <p>Review everything and mark what you forgot.</p>
                  </div>
                </article>
                <article className="intervaling-step rest-day">
                  <span>Day 4</span>
                  <div>
                    <strong>Rest</strong>
                    <p>Take one day off again.</p>
                  </div>
                </article>
                <article className="intervaling-step study-day">
                  <span>After</span>
                  <div>
                    <strong>10-15 minutes</strong>
                    <p>Every other day, practice only the parts you forgot.</p>
                  </div>
                </article>
              </div>
              <button className="generate-button pomodoro-use-button" type="button" onClick={startIntervalingPlan}>
                Start and add to calendar
              </button>
            </div>
          </section>
        </div>
      )}

      {isBlurtingPracticeOpen && (
        <div className="summary-modal-backdrop" role="presentation">
          <section className="summary-modal blurting-practice-modal" role="dialog" aria-modal="true" aria-label="Blurting practice">
            <div className="summary-modal-heading">
              <div>
                <p className="card-label">Blurting</p>
                <h2>{blurtingReview ? 'Checked paper' : 'Write from memory'}</h2>
              </div>
              <button className="small-button" type="button" onClick={() => setIsBlurtingPracticeOpen(false)}>
                Close
              </button>
            </div>
            <div className="blurting-practice-copy">
              {!blurtingReview ? (
                <>
                  <label className="field">
                    <span>What do you remember?</span>
                    <textarea
                      value={blurtingNotes}
                      onChange={(event) => {
                        setBlurtingNotes(event.target.value);
                        setBlurtingError('');
                      }}
                      placeholder="Hide your notes, then type everything you remember about the topic..."
                    />
                  </label>
                  <button className="generate-button pomodoro-use-button" type="button" onClick={submitBlurtingPractice} disabled={isBlurtingChecking}>
                    {isBlurtingChecking ? 'Checking...' : 'Submit'}
                  </button>
                  {blurtingError && <p className="message">{blurtingError}</p>}
                </>
              ) : (
                <div className="blurting-paper-review" aria-label="Blurting feedback">
                  <div className="blurting-highlight-legend" aria-label="Highlight colors">
                    <span className="good">Good</span>
                    <span className="needs-work">Needs work</span>
                    <span className="wrong">Wrong</span>
                  </div>
                  <div className="blurting-paper" aria-label="Highlighted blurting notes">
                    {getBlurtingHighlightSegments(blurtingNotes, blurtingReview.highlights ?? []).map((segment, index) =>
                      segment.category ? (
                        <mark
                          className={`blurting-highlight ${getBlurtingCategoryClass(segment.category)}`}
                          key={`highlight-${index}`}
                          title={segment.note}
                        >
                          {segment.text}
                        </mark>
                      ) : (
                        <span key={`plain-${index}`}>{segment.text}</span>
                      ),
                    )}
                  </div>
                  {blurtingReview.highlights?.some((highlight) => highlight.note) && (
                    <div className="blurting-highlight-notes">
                      {blurtingReview.highlights.filter((highlight) => highlight.note).map((highlight, index) => (
                        <p
                          className={getBlurtingCategoryClass(normalizeBlurtingCategory(highlight.category))}
                          key={`${highlight.quote}-${index}`}
                        >
                          <strong>{normalizeBlurtingCategory(highlight.category) === 'needsWork' ? 'Needs work' : normalizeBlurtingCategory(highlight.category)}:</strong>{' '}
                          {highlight.note}
                        </p>
                      ))}
                    </div>
                  )}
                  <article className="blurting-review-card">
                    <h3>Review</h3>
                    <p>{blurtingReview.review || 'Review the missing details, then try blurting again later.'}</p>
                  </article>
                  <button
                    className="small-button muted-button blurting-edit-button"
                    type="button"
                    onClick={() => {
                      setBlurtingReview(null);
                      setBlurtingError('');
                    }}
                  >
                    Edit answer
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {isTeachChatOpen && (
        <div className="summary-modal-backdrop" role="presentation">
          <section className="summary-modal teach-pet-modal" role="dialog" aria-modal="true" aria-label="Teach your pet">
            <div className="summary-modal-heading">
              <h2>Teach {petName}</h2>
              <button className="small-button" type="button" onClick={() => setIsTeachChatOpen(false)}>
                Close
              </button>
            </div>
            <div className="teach-pet-chat">
              {teachMessages.map((message, index) => (
                <article className={`teach-message ${message.role}`} key={`${message.role}-${index}`}>
                  {message.role === 'pet' && (
                    <span className={`teach-pet-avatar egg-${displayedEggColor}`} aria-hidden="true">
                      {studyPet.petImage ? (
                        <img src={studyPet.petImage} alt="" />
                      ) : (
                        <span className="teach-pet-avatar-egg" />
                      )}
                    </span>
                  )}
                  <div>
                    <p className="card-label">{message.role === 'user' ? copy.you : petName}</p>
                    <p>{message.text}</p>
                  </div>
                </article>
              ))}
              {isTeachPetThinking && (
                <article className="teach-message pet">
                  <span className={`teach-pet-avatar egg-${displayedEggColor}`} aria-hidden="true">
                    {studyPet.petImage ? (
                      <img src={studyPet.petImage} alt="" />
                    ) : (
                      <span className="teach-pet-avatar-egg" />
                    )}
                  </span>
                  <div>
                    <p className="card-label">{petName}</p>
                    <p>Thinking of a question...</p>
                  </div>
                </article>
              )}
            </div>
            <label className="teach-pet-composer">
              <textarea
                value={teachAnswer}
                onChange={(event) => setTeachAnswer(event.target.value)}
                placeholder="Explain the topic to your pet..."
              />
              <button className="generate-button" type="button" onClick={sendTeachAnswer} disabled={isTeachPetThinking}>
                {isTeachPetThinking ? 'Thinking...' : 'Send'}
              </button>
            </label>
          </section>
        </div>
      )}

      {hatchPopup && (
        <div className="hatch-modal-backdrop" role="presentation">
          <section className="hatch-modal" role="dialog" aria-modal="true" aria-label="Egg hatching">
            <button
              className={`hatch-egg hatch-${hatchPopup.stage} egg-${hatchPopup.eggColor}`}
              type="button"
              onClick={hatchEgg}
              aria-label={hatchPopup.stage === 'ready' ? 'Tap egg to hatch' : 'Egg is hatching'}
            >
              <span className="hatch-egg-piece hatch-egg-top">
                <span className="hatch-egg-spot spot-one" />
                <span className="hatch-egg-spot spot-four" />
              </span>
              <span className="hatch-egg-piece hatch-egg-bottom">
                <span className="hatch-egg-spot spot-two" />
                <span className="hatch-egg-spot spot-three" />
                <span className="hatch-egg-spot spot-five" />
              </span>
              {hatchPopup.stage === 'open' && (
                <img className="hatch-pet-image" src={hatchPopup.petImage} alt="" />
              )}
            </button>
            <p>{hatchPopup.stage === 'ready' ? 'Tap the egg to hatch it.' : hatchPopup.stage === 'cracked' ? 'Crack...' : 'Your pet hatched!'}</p>
          </section>
        </div>
      )}

      {page !== 'starter' && (
        <>
          <button
            className={isToolDrawerOpen ? 'tool-drawer-tab open' : 'tool-drawer-tab'}
            type="button"
            onClick={() => setIsToolDrawerOpen(!isToolDrawerOpen)}
            aria-label={isToolDrawerOpen ? 'Close tools menu' : 'Open tools menu'}
            aria-expanded={isToolDrawerOpen}
          >
            {isToolDrawerOpen ? '<' : '>'}
          </button>
          <aside
            className={isToolDrawerOpen ? 'tool-drawer open' : 'tool-drawer'}
            aria-label="Tool menu"
            data-tutorial-target="tool-drawer"
          >
            <div className="tool-drawer-heading">
              <p className="card-label">Tools</p>
            </div>
            <button
              className="drawer-tool-button"
              type="button"
              onClick={() => goToPage('progress')}
            >
              {copy.progress}
            </button>
            <button
              className="drawer-tool-button"
              type="button"
              onClick={() => goToPage('leaderboard')}
            >
              {copy.leaderboard}
            </button>
            <button
              className="drawer-tool-button"
              type="button"
              onClick={() => {
                if (requireSignedIn(copy.signInForTutor)) {
                  goToPage('tutor');
                }
              }}
            >
              {copy.aiTutor}
            </button>
            <button
              className="drawer-tool-button"
              type="button"
              onClick={() => goToPage('calendar')}
            >
              {copy.calendar}
            </button>
            <button
              className="drawer-tool-button"
              type="button"
              onClick={() => goToPage('studyMethods')}
            >
              {copy.studyMethods}
            </button>
            <button
              className="drawer-tool-button"
              type="button"
              onClick={() => goToPage('notes')}
            >
              {copy.notes}
            </button>
            <button
              className="drawer-tool-button"
              type="button"
              onClick={() => goToPage('calculator')}
            >
              {copy.calculator}
            </button>
          </aside>

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
            onClick={() => goToPage('otherMaterials')}
            aria-label="Open other materials page"
            data-tutorial-target="search-button"
          >
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="27" cy="27" r="17" />
              <path d="M40 40l16 16" />
            </svg>
          </button>
          <button
            className="bottom-icon-button account-button"
            type="button"
            onClick={() => goToPage('account')}
            aria-label="Open account page"
          >
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="26" />
              <circle cx="32" cy="24" r="9" />
              <path d="M17 52c2-12 8-18 15-18s13 6 15 18" />
            </svg>
          </button>
        </>
      )}
    </main>
  );
}
