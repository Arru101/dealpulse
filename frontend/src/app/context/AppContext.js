'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';

const AppContext = createContext();

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export function AppContextProvider({ children }) {
  // Theme state
  const [theme, setTheme] = useState('light');
  
  // Auth state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // User features state
  const [wishlist, setWishlist] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [compareList, setCompareList] = useState([]);

  // Cookie Consent state
  const [cookieConsent, setCookieConsent] = useState(null); // null means not answered yet

  // 1. Initialize Theme, Cookies, and Auth
  useEffect(() => {
    // Theme setup
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Cookies consent setup
    const consent = localStorage.getItem('cookieConsent');
    if (consent) {
      setCookieConsent(JSON.parse(consent));
    }

    // Comparison list setup
    const savedCompare = localStorage.getItem('compareList');
    if (savedCompare) {
      setCompareList(JSON.parse(savedCompare));
    }

    // Listen to Firebase auth changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await getIdToken(firebaseUser);
          
          // Authenticate with Express Backend
          const res = await fetch(`${BACKEND_URL}/api/auth/session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              idToken,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName
            })
          });

          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setToken(data.token);
            setWishlist(data.user.wishlist || []);
            setRecentlyViewed(data.user.recentlyViewed || []);
            localStorage.setItem('authToken', data.token);
          } else {
            console.error('Failed to sync session with backend');
            setUser(null);
            setToken(null);
          }
        } catch (err) {
          console.error('Error during auth listener execution:', err);
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem('authToken');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Toggle Theme Action
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  // 3. Google Sign In
  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'YOUR_FIREBASE_API_KEY') {
        throw new Error('Firebase Client API Key is placeholder/unconfigured.');
      }
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google login failed:', err);
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 3b. Developer Mock Login (for local testing/bypass)
  const loginAsDeveloper = async (enteredEmail, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idToken: 'mock-admin-token',
          uid: 'mock_admin_123',
          email: enteredEmail.trim(),
          displayName: 'Developer Account',
          password
        })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        setWishlist(data.user.wishlist || []);
        setRecentlyViewed(data.user.recentlyViewed || []);
        localStorage.setItem('authToken', data.token);
        return data.user;
      } else {
        throw new Error('Backend failed to create developer session.');
      }
    } catch (err) {
      console.error('Mock login failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 4. Logout Action
  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      await fetch(`${BACKEND_URL}/api/auth/logout`, { method: 'POST' });
      setUser(null);
      setToken(null);
      setWishlist([]);
      setRecentlyViewed([]);
      localStorage.removeItem('authToken');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 5. Toggle Wishlist Action
  const toggleWishlist = async (productId) => {
    if (!user) {
      alert('Please log in to add items to your wishlist!');
      return;
    }

    try {
      const activeToken = token || localStorage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/auth/wishlist/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ productId })
      });

      if (res.ok) {
        const data = await res.json();
        setWishlist(data.wishlist);
        
        // Sync wishlist to user state
        setUser(prev => ({ ...prev, wishlist: data.wishlist }));
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
    }
  };

  // 6. Add Recently Viewed Action
  const addRecentlyViewed = async (productId) => {
    if (!user) return;

    try {
      const activeToken = token || localStorage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/auth/recently-viewed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ productId })
      });

      if (res.ok) {
        const data = await res.json();
        setRecentlyViewed(data.recentlyViewed);
        setUser(prev => ({ ...prev, recentlyViewed: data.recentlyViewed }));
      }
    } catch (err) {
      console.error('Error adding recently viewed:', err);
    }
  };

  // 7. Save Cookie Preferences Action
  const saveCookiePreferences = (prefs) => {
    setCookieConsent(prefs);
    localStorage.setItem('cookieConsent', JSON.stringify(prefs));
  };

  // 8. Delete User Account Profile GDPR Action
  const deleteAccount = async () => {
    if (!user) return;
    try {
      const activeToken = token || localStorage.getItem('authToken');
      const res = await fetch(`${BACKEND_URL}/api/auth/delete-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      if (res.ok) {
        await logout();
        alert('Your profile and data have been removed from the platform.');
      } else {
        alert('Failed to delete account. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  };

  // 9. Comparison Actions
  const addToCompare = (productId) => {
    if (compareList.includes(productId)) {
      return;
    }
    if (compareList.length >= 3) {
      alert('You can compare a maximum of 3 products at a time.');
      return;
    }
    const newList = [...compareList, productId];
    setCompareList(newList);
    localStorage.setItem('compareList', JSON.stringify(newList));
  };

  const removeFromCompare = (productId) => {
    const newList = compareList.filter(id => id !== productId);
    setCompareList(newList);
    localStorage.setItem('compareList', JSON.stringify(newList));
  };

  const clearCompare = () => {
    setCompareList([]);
    localStorage.removeItem('compareList');
  };

  return (
    <AppContext.Provider value={{
      theme,
      toggleTheme,
      user,
      token,
      loading,
      loginWithGoogle,
      loginAsDeveloper,
      logout,
      wishlist,
      recentlyViewed,
      toggleWishlist,
      addRecentlyViewed,
      compareList,
      addToCompare,
      removeFromCompare,
      clearCompare,
      cookieConsent,
      saveCookiePreferences,
      deleteAccount,
      backendUrl: BACKEND_URL
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
