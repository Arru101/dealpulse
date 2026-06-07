import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: "affilate-amz.firebaseapp.com",
  databaseURL: "https://affilate-amz-default-rtdb.firebaseio.com",
  projectId: "affilate-amz",
  storageBucket: "affilate-amz.firebasestorage.app",
  messagingSenderId: "802104058024",
  appId: "1:802104058024:web:6f2f74e883b4587841e29d",
  measurementId: "G-6VM55B2L5K"
};

// Initialize Firebase safely for SSR (Server Side Rendering)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
