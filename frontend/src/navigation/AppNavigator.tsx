import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { theme } from '../lib/theme';
import AuthScreen from '../screens/AuthScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import LeaderboardScreen from '../screens/LeaderBoardScreen';
import LessonScreen from '../screens/LessonScreen';
import LessonsListScreen from '../screens/LessonsListScreen'; // New screen for listing lessons
import ProfileScreen from '../screens/ProfileScreen';
import TopicScreen from '../screens/TopicScreen';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        tabBarIcon: ({ color, size }) => {
          let name;
          if (route.name === 'Home') name = 'home';
          if (route.name === 'Topics') name = 'grid';
          if (route.name === 'Profile') name = 'person';
          if (route.name === 'Leaderboard') name = 'trophy';
          return <Ionicons name={name as any} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Topics" component={TopicScreen} />
      <Tabs.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="LanguageSelect" component={LanguageSelectionScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Lessons" component={LessonsListScreen} />
      <Stack.Screen name="Lesson" component={LessonScreen} />
    </Stack.Navigator>
  );
}