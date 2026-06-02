import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
    getAnalytics,
    isSupported
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-analytics.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import {
    getDatabase,
    ref,
    get,
    set,
    push,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyA_HF0rjhfbYOUYFNIWBQEk-bAkqpm8-7U",
    authDomain: "ippl-6360c.firebaseapp.com",
    databaseURL: "https://ippl-6360c-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ippl-6360c",
    storageBucket: "ippl-6360c.firebasestorage.app",
    messagingSenderId: "713530006885",
    appId: "1:713530006885:web:784b84718382560fd4958c",
    measurementId: "G-BZZ9KE1F8N"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const realtimeDb = getDatabase(app);
const analyticsPromise = isSupported().then((supported) => supported ? getAnalytics(app) : null);

export {
    app,
    auth,
    googleProvider,
    realtimeDb,
    analyticsPromise,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    ref,
    get,
    set,
    push,
    serverTimestamp
};
