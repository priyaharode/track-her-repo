import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

// Sign up with email + password
export const signUp = async (name, email, password) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  // Save the display name to the Firebase user profile
  await updateProfile(result.user, { displayName: name });
  return result.user;
};

// Sign in with email + password
export const signIn = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

// Sign in with Google
export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

// Sign out
export const logOut = async () => {
  await signOut(auth);
};

// Listen to auth state changes (user logged in or out)
// Call this once at the app level
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};