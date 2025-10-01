import Constants from 'expo-constants';
import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, initializeAuth } from 'firebase/auth';

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

const firebaseConfig = {
  apiKey: extra.FIREBASE_API_KEY || "AIzaSyCXvoF7suAoyW9uDPDy6K3T4xjZP523QKo",
  authDomain: extra.FIREBASE_AUTH_DOMAIN || "skillsphere-yuvaai.firebaseapp.com",
  projectId: extra.FIREBASE_PROJECT_ID || "skillsphere-yuvaai",
  storageBucket: extra.FIREBASE_STORAGE_BUCKET || "skillsphere-yuvaai.firebasestorage.app",
  messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID || "584997285974",
  appId: extra.FIREBASE_APP_ID || "1:584997285974:web:9908f3883b4be57f928bf7",
};

const app = initializeApp(firebaseConfig);

// ✅ Auth with persistence (React Native)
export const auth = initializeAuth(app, {
});
export const googleProvider = new GoogleAuthProvider();

// ✅ Firestore with persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
