// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB6mMtnXq6aQ0rU2uPwWa8b1GiJoOe0ycA",
  authDomain: "producer-license-tracker.firebaseapp.com",
  databaseURL: "https://producer-license-tracker-default-rtdb.firebaseio.com",
  projectId: "producer-license-tracker",
  storageBucket: "producer-license-tracker.appspot.com",
  messagingSenderId: "254839154376",
  appId: "1:254839154376:web:1f0a53e7dc3c78cf4dcde0",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };
