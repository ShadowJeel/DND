import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app, "(default)");
const auth = getAuth(app);
const storage = getStorage(app);

// Diagnostic Helpers
const testFirestoreGet = async () => {
    console.log("%c[Firestore TEST] Starting GET request...", "color: #3b82f6; font-weight: bold;");
    const start = Date.now();
    try {
        const { collection, getDocs, limit, query } = await import("firebase/firestore");
        const q = query(collection(db, "products"), limit(1));
        const snap = await getDocs(q);
        const duration = Date.now() - start;
        console.log(`%c[Firestore TEST] GET Success! Found ${snap.size} products. Timing: ${duration}ms`, "color: #10b981; font-weight: bold;");
        return { success: true, count: snap.size, duration };
    } catch (error: any) {
        console.error("%c[Firestore TEST] GET Failed!", "color: #ef4444; font-weight: bold;", {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        return { success: false, error };
    }
};

const testFirestorePost = async () => {
    console.log("%c[Firestore TEST] Starting POST (write) request...", "color: #3b82f6; font-weight: bold;");
    const start = Date.now();
    try {
        const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
        const docRef = await addDoc(collection(db, "diagnostics"), {
            test_run: true,
            timestamp: serverTimestamp(),
            platform: "admin-portal"
        });
        const duration = Date.now() - start;
        console.log(`%c[Firestore TEST] POST Success! Document ID: ${docRef.id}. Timing: ${duration}ms`, "color: #10b981; font-weight: bold;");
        return { success: true, id: docRef.id, duration };
    } catch (error: any) {
        console.error("%c[Firestore TEST] POST Failed!", "color: #ef4444; font-weight: bold;", {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        return { success: false, error };
    }
};

// Also expose to window for direct console testing
if (typeof window !== 'undefined') {
    (window as any).dbTest = { get: testFirestoreGet, post: testFirestorePost };
}

export { app, db, auth, storage, testFirestoreGet, testFirestorePost };
