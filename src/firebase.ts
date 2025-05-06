// Firebase configuration and initialization for Producer License Tracker
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7RziQ8SbNhr47n4Rb_UVoRgPIJNeVPb8",
  authDomain: "producer-license-tracker.firebaseapp.com",
  projectId: "producer-license-tracker",
  storageBucket: "producer-license-tracker.firebasestorage.app",
  messagingSenderId: "401751861322",
  appId: "1:401751861322:web:70dcbc3c0e21a0703e1eb3",
  measurementId: "G-CFF275M31H",
  databaseURL: "https://producer-license-tracker-default-rtdb.firebaseio.com",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

export { app, analytics, database };
