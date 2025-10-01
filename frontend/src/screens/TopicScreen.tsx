import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../lib/firebase'; // Ensure you have this import
import { theme } from '../lib/theme';

type Topic = {
  id: string;
  name: string;
  description: string;
};

// This is the fetch function that includes the Authorization header
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
      'Authorization': `Bearer ${idToken}`, // The ID token is sent here
    },
  });

  if (!response.ok) {
    throw new Error('API request failed.');
  }

  return response.json();
}

async function fetchTopicsFromApi(): Promise<Topic[]> {
  // Use the authenticated fetch function here
  const data: Topic[] = await fetchWithAuth('https://skillsphere-backend-uur2.onrender.com/topics');
  return data;
}

export default function TopicScreen() {
  const nav = useNavigation<any>();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const fetchedTopics = await fetchTopicsFromApi();
        if (!cancelled && fetchedTopics) {
          setTopics(fetchedTopics);
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          console.log('Could not fetch topics:', e.message);
        } else {
          console.log('Could not fetch topics:', e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openTopic = (topicId: string) => {
    nav.navigate('Lessons', { topicId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Topics</Text>
        <Text style={styles.subtitle}>Explore all learning paths</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={topics}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: theme.spacing.md }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openTopic(item.id)}>
              <View>
                <Text style={styles.cardTitle}>{item.name}</Text>
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
  header: { padding: theme.spacing.lg },
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