import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../lib/firebase';
import { theme } from '../lib/theme';

type Lesson = {
  id: string;
  title: string;
  xp: number;
  difficulty: string;
  estimatedMinutes: number;
  order: number;
};

type LessonsListRouteParams = {
  topicName: string;
  topicId: string;
};

type LessonsListScreenRouteProp = RouteProp<{ Lessons: LessonsListRouteParams }, 'Lessons'>;

async function fetchWithAuth(url: string) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated.');
  }
  const idToken = await user.getIdToken();
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
  });
  if (!response.ok) {
    throw new Error('API request failed.');
  }
  return response.json();
}

async function fetchLessonsFromApi(topicId: string): Promise<Lesson[]> {
  const data = await fetchWithAuth(`https://skillsphere-backend-uur2.onrender.com/lessons/${topicId}`);
  return data;
}

export default function LessonsListScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<LessonsListScreenRouteProp>();
  const { topicName, topicId } = route.params || {};
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (topicId) {
          const fetchedLessons = await fetchLessonsFromApi(topicId);
          if (!cancelled && fetchedLessons) {
            setLessons(fetchedLessons);
          }
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          console.log('Could not fetch lessons:', e.message);
        } else {
          console.log('Could not fetch lessons:', e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [topicId]);

  const handleLessonPress = (lesson: Lesson) => {
    nav.navigate('Lesson', { lessonData: lesson });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ paddingRight: 10 }}>
          <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: theme.typography.body }}>‹ {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{topicName || t('lessons')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={lessons}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: theme.spacing.md }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handleLessonPress(item)}>
              <View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.xp} {t('xp')} • {item.difficulty}
                </Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.spacing.lg, flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: theme.typography.h1, fontWeight: '800', color: theme.colors.text },
  subtitle: { color: theme.colors.muted, marginTop: 6, fontSize: theme.typography.small },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: { fontWeight: '700' },
  cardSubtitle: { color: theme.colors.muted, marginTop: 6 },
  chev: { color: theme.colors.muted },
});