import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDDS2A_6SSRhR0JdnOb-4uCR4BVNrLHfxE",
  authDomain: "matgar-hoda.firebaseapp.com",
  projectId: "matgar-hoda",
  storageBucket: "matgar-hoda.firebasestorage.app",
  messagingSenderId: "222464170115",
  appId: "1:222464170115:web:3e705a08bb48e5f7b2a3b6",
  measurementId: "G-2RTLDPN5MV",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export { firebaseConfig };
