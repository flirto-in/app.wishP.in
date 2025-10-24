import { createContext, useEffect, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored session on mount
    checkStoredSession();
  }, []);

  const checkStoredSession = async () => {
    // Add logic to check AsyncStorage/SecureStore for saved session
    setIsLoading(false);
  };

  const login = (phone) => {
    // Simulate OTP verification success
    setUser({ phone });
  };

  const logout = () => setUser(null);

  return <AuthContext.Provider value={{ user, login, logout,isLoading }}>{children}</AuthContext.Provider>;
};
