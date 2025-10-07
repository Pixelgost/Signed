import React, { createContext, useState, useContext, ReactNode } from 'react';
import Constants from 'expo-constants';
// React Context for Auth
// holds user info + token globally, setUser and setToken to update, and logout

const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;

interface AuthContextType {
  user: any | null;
  token: string | null;
  setUser: (user: any) => void;
  setToken: (token: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string | null>(null);
  
    const logout = async () => {
      if (!token) return;
  
      try {
        const API_URL = `http://${machineIp}:8000/api/v1/users/auth/sign-out/`;
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
  
        const data = await response.json();
        if (response.ok) {
          console.log('Logged out:', data);
          setUser(null);
          setToken(null);
          // If using AsyncStorage:
          // await AsyncStorage.removeItem('userToken');
          // await AsyncStorage.removeItem('userData');
        } else {
          console.warn('Logout failed:', data);
        }
      } catch (err) {
        console.error('Logout error:', err);
      }
    };

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
  };
