import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton de la app
let app: FirebaseApp;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (error) {
  console.error('Firebase Initialization Error:', error);
  app = initializeApp({ apiKey: 'fallback', projectId: 'fallback' }, 'fallback-app');
}

/**
 * OFFLINE-FIRST:
 * persistentLocalCache guarda todos los documentos leídos y ENCOLA las
 * escrituras en IndexedDB cuando no hay red. Al recuperar conexión,
 * Firestore vuelca automáticamente la cola al servidor (en orden).
 * persistentMultipleTabManager permite varias pestañas sin conflicto.
 *
 * En SSR (sin window) no hay IndexedDB: se usa Firestore en memoria.
 */
let db: Firestore;
if (typeof window !== 'undefined') {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // initializeFirestore solo puede llamarse una vez por app (HMR/dev)
    db = getFirestore(app);
  }
} else {
  db = getFirestore(app);
}

export { app, db };
