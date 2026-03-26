import { createContext, useContext, useEffect, useState } from "react";
import { onAuthChange } from "./auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading
  
  useEffect(() => {
    // Subscribe to auth state, unsubscribe on cleanup
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser); // null if logged out, user object if logged in
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — use this anywhere in your app to get the current user
export const useAuth = () => useContext(AuthContext);