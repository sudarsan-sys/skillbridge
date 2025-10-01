import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../lib/firebase';
import { theme } from '../lib/theme';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const nav = useNavigation();

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: Constants.expoConfig?.extra?.IOS_GOOGLE_CLIENT_ID,
    androidClientId: Constants.expoConfig?.extra?.ANDROID_GOOGLE_CLIENT_ID,
    webClientId: Constants.expoConfig?.extra?.WEB_GOOGLE_CLIENT_ID,
  });

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rePassword, setRePassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (response?.type === 'success' && response.authentication) {
        const { idToken, accessToken } = response.authentication as any;
        try {
          const credential = GoogleAuthProvider.credential(idToken, accessToken);
          const userCred = await signInWithCredential(auth, credential);
          const user = userCred.user;
          try {
            await setDoc(doc(db, 'userProfiles', user.uid), {
              name: user.displayName || null,
              email: user.email || null,
              photoURL: user.photoURL || null,
              points: 0,
              streakDays: 0,
              createdAt: serverTimestamp(),
              lastSeenAt: serverTimestamp()
            }, { merge: true });
          } catch (e) {
            console.log('Failed to write user doc', e);
          }
          // @ts-ignore
          nav.reset({ index: 0, routes: [{ name: 'LanguageSelect' }] });
        } catch (err) {
          console.warn('Firebase sign in failed', err);
          Alert.alert('Sign-in failed', 'Could not sign in with Google. Continuing in demo mode.');
          // @ts-ignore
          nav.reset({ index: 0, routes: [{ name: 'LanguageSelect' }] });
        }
      }
    })();
  }, [response, nav]);

  const persistUserDoc = async (user: any, userName: string) => {
    try {
      if (user.displayName !== userName) {
        await updateProfile(user, { displayName: userName });
      }
      await setDoc(doc(db, 'userProfiles', user.uid), {
        name: user.displayName || userName,
        email: user.email || null,
        photoURL: user.photoURL || null,
        points: 0,
        streakDays: 0,
        createdAt: serverTimestamp(),
        lastSeenAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.log('Failed to write user doc', e);
    }
  };

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!name || !email || !password || !rePassword) {
          Alert.alert('Missing fields', 'Please fill in all fields.');
          setLoading(false);
          return;
        }
        if (password !== rePassword) {
          Alert.alert('Password mismatch', 'Passwords do not match.');
          setLoading(false);
          return;
        }
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await persistUserDoc(userCred.user, name);
      } else {
        if (!email || !password) {
          Alert.alert('Missing fields', 'Please enter email and password');
          setLoading(false);
          return;
        }
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await persistUserDoc(userCred.user, userCred.user.displayName || 'User');
      }
      // @ts-ignore
      nav.reset({ index: 0, routes: [{ name: 'LanguageSelect' }] });
    } catch (e: any) {
      console.log('Email auth error', e.message || e);
      Alert.alert('Authentication failed', e.message || 'Unable to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      if (!Constants.expoConfig?.extra?.WEB_GOOGLE_CLIENT_ID) {
        Alert.alert('Not configured', 'Google Sign-in is not configured. Proceeding in demo mode.');
        // @ts-ignore
        nav.reset({ index: 0, routes: [{ name: 'LanguageSelect' }] });
        return;
      }
      await promptAsync();
    } catch (e) {
      console.log('Google auth error', e);
      Alert.alert('Sign-in error', 'Unable to start Google sign-in.');
    }
  };

  const handleContinueDemo = () => {
    // @ts-ignore
    nav.reset({ index: 0, routes: [{ name: 'LanguageSelect' }] });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[theme.colors.background, theme.colors.surfaceVariant]} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Ionicons name="school" size={72} color={theme.colors.primary} />
          <Text style={styles.title}>Skill Bridge</Text>
          <Text style={styles.subtitle}>Short lessons, real impact — 5 minutes a day.</Text>

          <TouchableOpacity style={styles.googleButton} onPress={handleGoogle} disabled={!request}>
            <Ionicons name="logo-google" size={20} color="#fff" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.form}>
            {mode === 'signup' && (
              <TextInput placeholder="Name" autoCapitalize="words" style={styles.input} value={name} onChangeText={setName} />
            )}
            <TextInput placeholder="Email" keyboardType="email-address" autoCapitalize="none" style={styles.input} value={email} onChangeText={setEmail} />
            <TextInput placeholder="Password" secureTextEntry style={styles.input} value={password} onChangeText={setPassword} />
            {mode === 'signup' && (
              <TextInput placeholder="Re-enter Password" secureTextEntry style={styles.input} value={rePassword} onChangeText={setRePassword} />
            )}

            <TouchableOpacity style={styles.authButton} onPress={handleEmailAuth} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.authButtonText}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchMode} onPress={() => setMode(m => m === 'signin' ? 'signup' : 'signin')}>
              <Text style={{ color: theme.colors.primary }}>{mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>By continuing you agree to our Terms & Privacy</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  title: { fontSize: theme.typography.h1, fontWeight: '800', color: theme.colors.text, marginTop: 12 },
  subtitle: { color: theme.colors.muted, textAlign: 'center', marginTop: 8, marginBottom: 20, maxWidth: 300 },
  googleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingVertical: 14, paddingHorizontal: 22, borderRadius: theme.radii.lg, width: '86%', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
  googleButtonText: { color: '#fff', marginLeft: 10, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, width: '86%' },
  divider: { flex: 1, height: 1, backgroundColor: theme.colors.outline },
  dividerText: { marginHorizontal: 12, color: theme.colors.muted },
  form: { width: '86%', backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.radii.lg, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6 },
  input: { borderWidth: 1, borderColor: theme.colors.outline, padding: 12, borderRadius: theme.radii.md, marginTop: 8 },
  authButton: { marginTop: 12, backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: theme.radii.md, alignItems: 'center' },
  authButtonText: { color: '#fff', fontWeight: '700' },
  switchMode: { marginTop: 12, alignItems: 'center' },
  demoButton: { marginTop: 16 },
  footer: { marginTop: 18, color: theme.colors.muted, fontSize: theme.typography.small }
});