
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAt4fneXTUD7wEiRGPhEsVQvZdbAcrw2oY",
  authDomain: "accessflow-6nezi.firebaseapp.com",
  projectId: "accessflow-6nezi",
  storageBucket: "accessflow-6nezi.firebasestorage.app",
  messagingSenderId: "739099346344",
  appId: "1:739099346344:web:6fd212e837eafd468f899d",
  measurementId: "G-71PD9225NK"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
// Initialize Analytics. It's good practice to check if it's a browser environment.
if (typeof window !== 'undefined') {
  // Conditionally initialize analytics if the config includes a measurementId
  // or if you decide to always initialize it.
  if (firebaseConfig.measurementId) {
    getAnalytics(app);
  }
}

export { app, auth };
