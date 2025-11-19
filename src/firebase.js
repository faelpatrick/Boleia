import { initializeApp } from "firebase/app";
import {
	getAuth,
	GoogleAuthProvider,
	signInWithPopup,
	onAuthStateChanged
} from "firebase/auth";
import {
	getDatabase,
	ref,
	set,
	onValue
} from "firebase/database";


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};



const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getDatabase(app);

export const loginGoogle = () => signInWithPopup(auth, provider);

export const listenAuth = (cb) => onAuthStateChanged(auth, cb);

export const updateUserPos = (uid, lat, lng, tipo, displayName) =>
	set(ref(db, "users/" + uid), { lat, lng, tipo, displayName });

export const listenUsers = (cb) =>
	onValue(ref(db, "users"), snap => cb(snap.val() || {}));
