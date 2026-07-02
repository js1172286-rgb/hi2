import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type AiResponse = {
  text?: string;
  error?: string;
};

type StudyMode = 'summary' | 'flashcards' | 'quiz';
type Page = 'study' | 'lessons' | 'otherMaterials' | 'tutor' | 'account' | 'flashcards' | 'quiz' | 'focusTimer';
type Language = 'en' | 'ru' | 'kk';
type Theme = 'light' | 'dark';
type TimerMode = 'focus' | 'break';

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

const savedLessonsKey = 'study-helper-lessons';
const languageKey = 'study-helper-language';
const themeKey = 'study-helper-theme';
const studyPetKey = 'study-helper-pet';
const maxSavedLessons = 6;
const eggWarmDays = 3;
const focusTimerSeconds = 25 * 60;
const breakTimerSeconds = 5 * 60;
const emptyStudyPet: StudyPet = {
  streak: 0,
  lastStudyDate: '',
  petType: null,
  petImage: null,
  eggColor: 'green',
  hasChosenEggColor: false,
};

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
};

const petFaces: Record<PetType, string> = {
  cat: '=^.^=',
  dragon: '^.=.^',
  fox: '^w^',
  owl: 'o,o',
};

const demoSummary = `- Study Helper turns notes into quick review tools.
- Saved lessons let you keep a few topics and add more sources later.
- Flashcards help you test facts one card at a time.
- Quizzes help you practice explaining answers in your own words.
- The streak pet grows when signed-in users keep studying.

Key terms:
Study streak, saved lessons, flashcards, quiz, AI tutor.

Quick review question:
Why can flashcards be useful before a quiz?`;

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
  study: '/',
  lessons: '/lessons',
  otherMaterials: '/other-materials',
  tutor: '/tutor',
  account: '/account',
  flashcards: '/flashcards',
  quiz: '/quiz',
  focusTimer: '/focus-timer',
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
  return 'study';
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
    checking: 'Checking...',
    createAccount: 'Create account',
    email: 'Email',
    flashcards: 'Flashcards',
    hide: 'Hide',
    language: 'Language',
    lessonName: 'Lesson name',
    lessons: 'Lessons',
    makeFlashcards: 'Make flashcards',
    makeQuiz: 'Make quiz',
    name: 'Name',
    options: 'Options',
    otherMaterials: 'Other Materials',
    password: 'Password',
    quiz: 'Quiz',
    quizMe: 'Quiz me',
    saveLesson: 'Save lesson',
    show: 'Show',
    signIn: 'Sign in',
    signOut: 'Sign out',
    studyHelper: 'Study helper',
    studyHelperTitle: 'Study Helper',
    studyMaterial: 'Study material',
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
    checking: 'Проверяю...',
    createAccount: 'Создать аккаунт',
    email: 'Эл. почта',
    flashcards: 'Карточки',
    hide: 'Скрыть',
    language: 'Язык',
    lessonName: 'Название урока',
    lessons: 'Уроки',
    makeFlashcards: 'Сделать карточки',
    makeQuiz: 'Сделать тест',
    name: 'Имя',
    options: 'Опции',
    otherMaterials: 'Другие материалы',
    password: 'Пароль',
    quiz: 'Тест',
    quizMe: 'Проверь меня',
    saveLesson: 'Сохранить урок',
    show: 'Показать',
    signIn: 'Войти',
    signOut: 'Выйти',
    studyHelper: 'Помощник учебы',
    studyHelperTitle: 'Помощник учебы',
    studyMaterial: 'Учебный материал',
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
    checking: 'Тексерілуде...',
    createAccount: 'Аккаунт ашу',
    email: 'Эл. пошта',
    flashcards: 'Карточкалар',
    hide: 'Жасыру',
    language: 'Тіл',
    lessonName: 'Сабақ атауы',
    lessons: 'Сабақтар',
    makeFlashcards: 'Карточка жасау',
    makeQuiz: 'Тест жасау',
    name: 'Аты',
    options: 'Опциялар',
    otherMaterials: 'Басқа материалдар',
    password: 'Құпия сөз',
    quiz: 'Тест',
    quizMe: 'Мені тексер',
    saveLesson: 'Сабақты сақтау',
    show: 'Көрсету',
    signIn: 'Кіру',
    signOut: 'Шығу',
    studyHelper: 'Оқу көмекшісі',
    studyHelperTitle: 'Оқу көмекшісі',
    studyMaterial: 'Оқу материалы',
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

function getStudyPetKey(userId?: string) {
  return userId ? `${studyPetKey}:${userId}` : studyPetKey;
}

function readStudyPet(userId?: string): StudyPet {
  try {
    if (!userId) return emptyStudyPet;

    const rawPet = window.localStorage.getItem(getStudyPetKey(userId));
    if (!rawPet) return emptyStudyPet;
    const parsed = JSON.parse(rawPet) as StudyPet;
    return {
      streak: Number.isFinite(parsed.streak) ? parsed.streak : 0,
      lastStudyDate: parsed.lastStudyDate || '',
      petType: petTypes.includes(parsed.petType as PetType) ? parsed.petType : null,
      petImage: typeof parsed.petImage === 'string' && parsed.petImage ? parsed.petImage : null,
      eggColor: eggColors.includes(parsed.eggColor as EggColor) ? parsed.eggColor : 'green',
      hasChosenEggColor: Boolean(parsed.hasChosenEggColor),
    };
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

function formatTimerTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
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
  const [page, setPage] = useState<Page>(() => getPageFromPath());
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>(() => readTheme());
  const [mode, setMode] = useState<StudyMode>('summary');
  const [lessonName, setLessonName] = useState('');
  const [material, setMaterial] = useState('');
  const [savedLessons, setSavedLessons] = useState<SavedLesson[]>([]);
  const [summary, setSummary] = useState('');
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
  const [quizError, setQuizError] = useState('');
  const [timerMode, setTimerMode] = useState<TimerMode>('focus');
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(focusTimerSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
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
  const hatchTimerRef = useRef<number | null>(null);

  const searchedSharedMaterials = sharedMaterials.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return `${item.subject} ${item.title} ${item.material}`.toLowerCase().includes(query);
  });
  const copy = fullTranslations[language];
  const currentAccountName = session?.user.user_metadata.display_name || session?.user.email || '';
  const isPetHatched = Boolean(studyPet.petType || studyPet.petImage);
  const petName = getPetName(studyPet.petType, studyPet.petImage, copy);
  const displayedEggColor = studyPet.hasChosenEggColor ? studyPet.eggColor : pendingEggColor;
  const warmDaysShown = Math.min(studyPet.streak, eggWarmDays);
  const warmDaysLeft = Math.max(0, eggWarmDays - studyPet.streak);
  const passwordErrors = [
    accountPassword.length < 8 ? copy.passwordRule8 : '',
    !/\d/.test(accountPassword) ? copy.passwordRuleNumber : '',
    !/[A-Z]/.test(accountPassword) ? copy.passwordRuleCapital : '',
  ].filter(Boolean);
  const currentFlashcard = flashcards[currentFlashcardIndex];

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

  useEffect(() => {
    setSavedLessons(readSavedLessons());
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
    const savedPet = readStudyPet(session?.user.id);
    setStudyPet(savedPet);
    setPendingEggColor(savedPet.eggColor);
    setHatchPopup(null);
  }, [session?.user.id]);

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
    return () => {
      if (hatchTimerRef.current) {
        window.clearTimeout(hatchTimerRef.current);
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
    if (!isTimerRunning) return;

    const timerId = window.setInterval(() => {
      setTimerSecondsLeft((secondsLeft) => {
        if (secondsLeft <= 1) {
          setIsTimerRunning(false);
          return 0;
        }

        return secondsLeft - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isTimerRunning]);

  function chooseTimerMode(nextMode: TimerMode) {
    setTimerMode(nextMode);
    setTimerSecondsLeft(nextMode === 'focus' ? focusTimerSeconds : breakTimerSeconds);
    setIsTimerRunning(false);
  }

  function resetTimer() {
    setTimerSecondsLeft(timerMode === 'focus' ? focusTimerSeconds : breakTimerSeconds);
    setIsTimerRunning(false);
  }

  function updateSavedLessons(nextLessons: SavedLesson[]) {
    setSavedLessons(nextLessons);
    window.localStorage.setItem(savedLessonsKey, JSON.stringify(nextLessons));
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
    setCurrentFlashcardIndex((index) => (index + 1) % flashcards.length);
    setIsFlashcardFlipped(false);
  }

  async function submitQuiz() {
    if (!isSupabaseConfigured) {
      setQuizError('Connect Supabase and the AI function first so answers can be checked by AI.');
      return;
    }

    if (quiz.length === 0) return;

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
    markStudyActivity();
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
    markStudyActivity();
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

    if (mode === 'quiz' && !requireSignedIn(copy.signInForQuiz)) {
      return;
    }

    if (mode === 'summary') {
      setSummary(demoSummary);
      setError('');
      setNotice('Demo summary is showing for preview. AI summaries can be turned back on later.');
      setFlashcards([]);
      setQuiz([]);
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
      goToPage('flashcards');
      markStudyActivity();
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
    markStudyActivity();
  }

  async function copySummaryToClipboard() {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      setNotice('Summary copied.');
    } catch {
      setError('Could not copy the summary.');
    }
  }

  return (
    <main className="app-shell drawer-open">
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
                      : copy.studyHelperTitle}
            </h1>
          </div>
          <div className="header-actions">
            {page === 'study' && (
              <button className="nav-button" type="button" onClick={() => setIsOptionsOpen(!isOptionsOpen)}>
                {copy.studyOptions}
              </button>
            )}
            {page === 'otherMaterials' ? (
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

        {page === 'otherMaterials' ? (
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
              <div className={isPetHatched ? 'pet-visual hatched' : `pet-visual egg egg-${displayedEggColor}`} aria-hidden="true">
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
              <label className="field">
                <span>{copy.askTutor}</span>
                <textarea
                  value={tutorQuestion}
                  onChange={(event) => setTutorQuestion(event.target.value)}
                  placeholder={copy.askTutorPlaceholder}
                />
              </label>
              <button className="generate-button" type="button" onClick={askTutor} disabled={isTutorLoading}>
                {isTutorLoading ? copy.thinking : copy.askTutor}
              </button>
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
        ) : page === 'focusTimer' ? (
          <section className="focus-timer-page" aria-label="Focus timer">
            <div className="timer-panel">
              <p className="card-label">Focus Timer</p>
              <div className="timer-display" aria-live="polite">
                {formatTimerTime(timerSecondsLeft)}
              </div>
              <p className="timer-hint">Use a quiet timer to stay on one task.</p>

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

                <label className="field">
                  <span>{copy.studyMaterial}</span>
                  <textarea
                    ref={materialTextareaRef}
                    value={material}
                    onChange={(event) => setMaterial(event.target.value)}
                    placeholder={copy.pasteMaterialFirst}
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

      {summary && (
        <div className="summary-modal-backdrop" role="presentation">
          <section className="summary-modal" role="dialog" aria-modal="true" aria-label={copy.quickSummary}>
            <div className="summary-modal-heading">
              <h2>{copy.quickSummary}</h2>
              <button className="small-button" type="button" onClick={() => setSummary('')}>
                Close
              </button>
            </div>
            <pre>{summary}</pre>
            <button className="generate-button summary-copy-button" type="button" onClick={copySummaryToClipboard}>
              Copy
            </button>
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

      <aside className="tool-drawer open" aria-label="Tool menu">
        <div className="tool-drawer-heading">
          <p className="card-label">Tools</p>
        </div>
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
          onClick={() => goToPage('focusTimer')}
        >
          Focus Timer
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
    </main>
  );
}
