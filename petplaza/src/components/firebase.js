// src/components/firebase.js
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Configuración de Firebase (se cópia desde la consola de Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyDKVZSO5qt3Uoo9fT1dl0AASfmrKndUr4w",
  authDomain: "petplazahospivet-d3568.firebaseapp.com",
  projectId: "petplazahospivet-d3568",
  storageBucket: "petplazahospivet-d3568.firebasestorage.app",
  messagingSenderId: "434714719401",
  appId: "1:434714719401:web:d8968e9c21e3fa032b25b8",
  measurementId: "G-XJBXVWY0BB"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Inicializa Firebase Storage
const storage = getStorage(app);

export { storage };