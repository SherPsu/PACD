// Firebase Configuration
// For local development: values are read from .env file
// For production: set environment variables during deployment

export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBqr4zFXGfITzuSJhMLG29FMPlUMFcpuek",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pacd-59a6d.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pacd-59a6d",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pacd-59a6d.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "278480981552",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:278480981552:web:c5198de402ab1ec6a9a7f5",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0Q2TGQ0G8Y"
};
