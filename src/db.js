import {
  doc, setDoc, getDoc,
  collection, query, orderBy, getDocs, serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

/* ─────────────────────────────────────────────
   USER PROFILE
───────────────────────────────────────────── */
export const saveUserProfile = async (uid, data) => {
  await setDoc(doc(db, "users", uid), data, { merge: true });
};

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};

/* ─────────────────────────────────────────────
   DAILY LOGS
───────────────────────────────────────────── */
export const saveDailyLog = async (uid, date, logData) => {
  const ref = doc(db, "users", uid, "logs", date);
  await setDoc(ref, {
    ...logData,
    date,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const getDailyLog = async (uid, date) => {
  const snap = await getDoc(doc(db, "users", uid, "logs", date));
  return snap.exists() ? snap.data() : null;
};

export const getAllLogs = async (uid) => {
  const q = query(
    collection(db, "users", uid, "logs"),
    orderBy("date", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
};

/* ─────────────────────────────────────────────
   CYCLE SETTINGS
───────────────────────────────────────────── */
export const saveCycleSettings = async (uid, settings) => {
  await setDoc(doc(db, "users", uid), {
    cycleSettings: settings,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const getCycleSettings = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists() && snap.data().cycleSettings) {
    return snap.data().cycleSettings;
  }
  return null;
};