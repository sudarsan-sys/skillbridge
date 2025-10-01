import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../lib/firebase';
import { translateLesson } from '../lib/language';
import { theme } from '../lib/theme';
import { useTTS } from '../lib/tts';

type LessonContent = {
  type: 'paragraph' | 'image' | 'quiz' | 'info' | 'scenario';
  text?: string;
  url?: string;
  questionText?: string;
  quizType?: string;
  options?: { id: string; text: string }[];
  correctAnswerId?: string;
  explanation?: string;
};

type AssessmentQuestion = {
  id: string;
  questionText: string;
  quizType: string;
  options: { id: string; text: string }[];
  correctAnswerId: string;
};

type LessonType = {
  id: string;
  title: string;
  xp: number;
  content: LessonContent[];
  assessment: {
    passingScore: number;
    questions: AssessmentQuestion[];
  };
};

type AssessmentResponse = {
  status: 'passed' | 'requires_review';
  score: number;
  xpEarned: number;
  nextLessonId?: string;
  remedialLesson?: {
    title: string;
    estimatedMinutes: number;
    difficulty: string;
    content: LessonContent[];
  };
};

type LessonRouteParams = {
  lessonData: LessonType;
};

type LessonScreenRouteProp = RouteProp<{ Lesson: LessonRouteParams }, 'Lesson'>;

async function fetchWithAuth(url: string, method = 'GET', body?: object) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated.');
  }
  const idToken = await user.getIdToken();
  const response = await fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error('API request failed.');
  }
  return response.json();
}

async function fetchLessonById(lessonId: string): Promise<LessonType> {
  const data = await fetchWithAuth(`https://skillsphere-backend-uur2.onrender.com/lesson/${lessonId}`);
  return data;
}

type Answer = { questionId: string; selectedOptionId: string };

async function submitAssessment(lessonId: string, answers: Answer[]): Promise<AssessmentResponse> {
  const data = await fetchWithAuth(
    `https://skillsphere-backend-uur2.onrender.com/assessments/${lessonId}/submit`,
    'POST',
    { answers }
  );
  return data;
}

type AssessmentViewProps = {
  assessment: LessonType['assessment'];
  onSubmit: (answers: Answer[]) => Promise<void>;
  assessmentResult: AssessmentResponse | null;
  onNextLesson?: () => void;
  onStartRemedial?: () => void;
};

function AssessmentView({ assessment, onSubmit, assessmentResult, onNextLesson, onStartRemedial }: AssessmentViewProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const { t, languageConfig } = useLanguage();

  const handleSelectOption = (questionId: string, selectedOptionId: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: selectedOptionId }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== assessment.questions.length) {
      Alert.alert(t('incomplete'), t('answerAllQuestions'));
      return;
    }
    setSubmitted(true);
    const formattedAnswers: Answer[] = Object.keys(answers).map(questionId => ({
      questionId,
      selectedOptionId: answers[questionId],
    }));
    await onSubmit(formattedAnswers);
  };

  if (assessmentResult) {
    return (
      <View style={styles.assessmentResultContainer}>
        <Text style={[styles.assessmentResultTitle, { fontSize: languageConfig.fontSize.h1 }]}>{t('assessmentComplete')}</Text>
        <Text style={[styles.assessmentResultText, { fontSize: languageConfig.fontSize.body }]}>{t('status')}: {assessmentResult.status}</Text>
        <Text style={[styles.assessmentResultText, { fontSize: languageConfig.fontSize.body }]}>{t('score')}: {assessmentResult.score}%</Text>
        <Text style={[styles.assessmentResultText, { fontSize: languageConfig.fontSize.body }]}>{t('xpEarned')}: {assessmentResult.xpEarned}</Text>

        {assessmentResult.status === 'passed' && (
          <TouchableOpacity
            style={styles.nextLessonButton}
            onPress={assessmentResult.nextLessonId ? onNextLesson : () => Alert.alert('Congrats', 'You have completed all lessons!')}
          >
            <Text style={[styles.nextLessonButtonText, { fontSize: languageConfig.fontSize.body }]}>{assessmentResult.nextLessonId ? t('nextLesson') : t('goToHome')}</Text>
          </TouchableOpacity>
        )}

        {assessmentResult.status === 'requires_review' && assessmentResult.remedialLesson && (
          <View style={styles.remedialCard}>
            <Text style={[styles.remedialTitle, { fontSize: languageConfig.fontSize.h2 }]}>{t('remedialLesson')}</Text>
            <Text style={[styles.remedialText, { fontSize: languageConfig.fontSize.body }]}>{assessmentResult.remedialLesson.title}</Text>
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={onStartRemedial}
            >
              <Text style={[styles.reviewButtonText, { fontSize: languageConfig.fontSize.body }]}>{t('review')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.assessmentContainer}>
      <Text style={[styles.assessmentTitle, { fontSize: languageConfig.fontSize.h1 }]}>{t('assessment')}</Text>
      <FlatList
        data={assessment.questions}
        keyExtractor={item => item.id}
        renderItem={({ item }: { item: AssessmentQuestion }) => (
          <View style={styles.questionCard}>
            <Text style={[styles.questionText, { fontSize: languageConfig.fontSize.body }]}>{item.questionText}</Text>
            {item.options.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  answers[item.id] === option.id && styles.optionSelected,
                  submitted && answers[item.id] === item.correctAnswerId && styles.optionCorrect,
                  submitted && answers[item.id] === option.id && answers[item.id] !== item.correctAnswerId && styles.optionIncorrect,
                ]}
                onPress={() => handleSelectOption(item.id, option.id)}
              >
                <Text style={[styles.optionText, { fontSize: languageConfig.fontSize.body }]}>{option.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
      {!submitted && (
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={[styles.submitBtnText, { fontSize: languageConfig.fontSize.body }]}>{t('submitAssessment')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function LessonScreen() {
  const route = useRoute<LessonScreenRouteProp>();
  const nav = useNavigation<any>();
  const { lessonData } = route.params;
  const [lesson, setLesson] = useState<LessonType | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResponse | null>(null);
  const [contentIndex, setContentIndex] = useState(0);
  const { t, languageConfig, currentLanguage } = useLanguage();
  const { speak, stop, isPlaying: ttsIsPlaying } = useTTS();

  const handleNextContent = () => {
    if (!lesson || !lesson.content || contentIndex >= lesson.content.length) {
      return;
    }
    setContentIndex(contentIndex + 1);
  };

  const handleSubmitAssessment = async (answers: Answer[]) => {
    try {
      if (lesson) {
        const result = await submitAssessment(lesson.id, answers);
        setAssessmentResult(result);
      }
    } catch (e: unknown) {
      Alert.alert(t('error'), t('failedToSubmitAssessment'));
    }
  };

  const handlePlayAudio = async (text: string) => {
    if (ttsIsPlaying()) {
      stop();
    } else {
      await speak(text, currentLanguage);
    }
  };

  const handleNextLesson = async () => {
    if (assessmentResult?.status === 'passed' && assessmentResult.nextLessonId) {
      try {
        const nextLessonData = await fetchLessonById(assessmentResult.nextLessonId);
        nav.push('Lesson', { lessonData: nextLessonData });
      } catch (err: unknown) {
        console.error('Error fetching next lesson:', err);
        Alert.alert(t('error'), t('failedToLoadNextLesson'));
      }
    } else if (assessmentResult?.status === 'passed' && !assessmentResult.nextLessonId) {
      Alert.alert(t('congrats'), t('allLessonsCompleted'));
      nav.navigate('Home');
    }
  };

  const handleStartRemedial = () => {
    if (assessmentResult?.status === 'requires_review' && assessmentResult.remedialLesson && lesson) {
      const remedialLessonData = {
        ...lesson,
        title: assessmentResult.remedialLesson.title,
        content: assessmentResult.remedialLesson.content,
        assessment: lesson.assessment,
      };
      setLesson(remedialLessonData);
      setAssessmentResult(null);
      setContentIndex(0);
    }
  };
  
  // New useEffect to handle initial lesson data and translation
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Use lessonData from params to set initial state
      if (lessonData && !lessonData.content) {
        // If only ID is passed, fetch the full lesson
        const fetchedLesson = await fetchLessonById(lessonData.id);
        if (cancelled) return;
        if (currentLanguage !== 'en') {
          const translated = await translateLesson(fetchedLesson, currentLanguage);
          setLesson(translated);
        } else {
          setLesson(fetchedLesson);
        }
      } else {
        // If full lesson data is passed, translate it
        if (currentLanguage !== 'en') {
          const translated = await translateLesson(lessonData, currentLanguage);
          if (!cancelled) {
            setLesson(translated);
          }
        } else {
          setLesson(lessonData);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [lessonData, currentLanguage]);

  if (!lesson) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const showAssessment = contentIndex >= lesson.content.length;
  const isLastContentBlock = contentIndex === lesson.content.length - 1;
  const currentContent = lesson.content[contentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ paddingRight: 10 }}>
          <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: languageConfig.fontSize.body }}>‹ {t('back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { fontSize: languageConfig.fontSize.h1 }]}>{lesson.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {showAssessment ? (
        <AssessmentView assessment={lesson.assessment} onSubmit={handleSubmitAssessment} assessmentResult={assessmentResult} onNextLesson={handleNextLesson} onStartRemedial={handleStartRemedial} />
      ) : (
        <View style={styles.contentContainer}>
          <View style={styles.contentCard}>
            {currentContent && currentContent.type === 'paragraph' && (
              <Text style={[styles.paragraphText, { fontSize: languageConfig.fontSize.body }]}>
                {currentContent.text}
              </Text>
            )}
            {currentContent && currentContent.type === 'info' && (
              <Text style={[styles.infoText, { fontSize: languageConfig.fontSize.body }]}>
                 {currentContent.text}
              </Text>
            )}
            {currentContent && currentContent.type === 'scenario' && (
              <Text style={[styles.scenarioText, { fontSize: languageConfig.fontSize.body }]}>
                 {currentContent.text}
              </Text>
            )}
            {currentContent && (currentContent.type === 'paragraph' || currentContent.type === 'info' || currentContent.type === 'scenario') && (
              <TouchableOpacity style={styles.audioButton} onPress={() => handlePlayAudio(currentContent.text || '')}>
                <Ionicons name={ttsIsPlaying() ? 'stop-circle' : 'play-circle'} size={32} color={theme.colors.primary} />
                <Text style={[styles.audioButtonText, { fontSize: languageConfig.fontSize.small }]}>
                  {ttsIsPlaying() ? t('stopAudio') : t('playAudio')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNextContent}>
            <Text style={[styles.nextBtnText, { fontSize: languageConfig.fontSize.body }]}>
              {isLastContentBlock ? t('startAssessment') : t('next')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.spacing.lg, flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: theme.typography.h1, fontWeight: '800', color: theme.colors.text },
  contentContainer: { flex: 1, padding: theme.spacing.lg, justifyContent: 'space-between' },
  contentCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.lg, padding: theme.spacing.lg },
  paragraphText: { fontSize: theme.typography.body, lineHeight: 24, color: theme.colors.text },
  infoText: { fontSize: theme.typography.body, lineHeight: 24, color: theme.colors.text, fontStyle: 'italic' },
  scenarioText: { fontSize: theme.typography.body, lineHeight: 24, color: theme.colors.text, fontWeight: 'bold' },
  audioButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: theme.spacing.md },
  audioButtonText: { color: theme.colors.primary, marginLeft: 8 },
  nextBtn: { backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: theme.radii.md, alignItems: 'center' },
  nextBtnText: { color: 'white', fontWeight: 'bold' },

  assessmentContainer: { flex: 1, padding: theme.spacing.lg },
  assessmentTitle: { fontSize: theme.typography.h1, fontWeight: 'bold', marginBottom: theme.spacing.md },
  questionCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  questionText: { fontSize: theme.typography.body, fontWeight: 'bold', marginBottom: theme.spacing.sm },
  optionButton: { backgroundColor: theme.colors.surfaceVariant, padding: theme.spacing.sm, borderRadius: theme.radii.sm, marginBottom: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.outline },
  optionSelected: { borderColor: theme.colors.primary, borderWidth: 2 },
  optionCorrect: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  optionIncorrect: { backgroundColor: theme.colors.error, borderColor: theme.colors.error },
  optionText: { fontSize: theme.typography.body, color: theme.colors.text },
  submitBtn: { backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: theme.radii.md, alignItems: 'center', marginTop: theme.spacing.md },
  submitBtnText: { color: 'white', fontWeight: 'bold' },

  assessmentResultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  assessmentResultTitle: { fontSize: theme.typography.h1, fontWeight: 'bold', marginBottom: theme.spacing.md },
  assessmentResultText: { fontSize: theme.typography.body, color: theme.colors.text, marginBottom: theme.spacing.xs },
  nextLessonButton: { backgroundColor: theme.colors.success, padding: theme.spacing.md, borderRadius: theme.radii.md, marginTop: theme.spacing.lg },
  nextLessonButtonText: { color: 'white', fontWeight: 'bold' },
  remedialCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.radii.lg, marginTop: theme.spacing.lg, alignItems: 'center' },
  remedialTitle: { fontSize: theme.typography.h2, fontWeight: 'bold', color: theme.colors.error, marginBottom: theme.spacing.sm },
  remedialText: { textAlign: 'center', marginBottom: theme.spacing.md },
  reviewButton: { backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: theme.radii.md },
  reviewButtonText: { color: 'white', fontWeight: 'bold' },
  errorText: { color: theme.colors.error, textAlign: 'center', marginTop: 20 },
});