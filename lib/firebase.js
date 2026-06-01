// lib/firebase.js

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";

// COMPAT IMPORT for OTP + Recaptcha
import firebase from "firebase/compat/app";
import "firebase/compat/auth";

// ------------------------------
// Correct Firebase Config
// ------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyD-SZQP7VFhXNCA1nH6A9RdKcvPLDyUWqY",
  authDomain: "quickfynd.firebaseapp.com",
  projectId: "quickfynd",
  storageBucket: "quickfynd.appspot.com", // fixed typo
  messagingSenderId: "861878384152",
  appId: "1:861878384152:web:77f8a284f5e0493895756d",
  measurementId: "G-03M3YYEZFE"
};

// ------------------------------
// Initialize modular app
// ------------------------------
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Modular Auth
export const auth = getAuth(app);

// Ensure user stays logged in until sign out
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// ------------------------------
// Initialize COMPAT Firebase (required for RecaptchaVerifier + OTP)
// ------------------------------
if (typeof window !== "undefined") {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  window.firebase = firebase;
}

// ------------------------------
// Recaptcha Verifier Helper
// ------------------------------
export const getRecaptchaVerifier = () => {
  if (typeof window === "undefined") return null;

  const compat = window.firebase?.auth;
  if (!compat) return null;

  return new compat.RecaptchaVerifier(
    "recaptcha-container",
    { size: "invisible" },
    auth
  );
};

export default app;
