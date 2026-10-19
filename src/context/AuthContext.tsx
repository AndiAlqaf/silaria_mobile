import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/client';

export type Role = 'SUPER' | 'ADMIN' | 'FRONTDESK' | 'SUPERVISOR' | 'CANTEEN' | 'LAUNDR' | 'DRIVER' | 'LAUNDRY' | null;

interface AuthContextData {
  user: any;
  role: Role;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('@user');
      const storedRole = await AsyncStorage.getItem('@role');
      if (storedUser && storedRole) {
        setUser(JSON.parse(storedUser));
        setRole(storedRole as Role);
      }
    } catch (e) {
      console.log('Failed to fetch token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password?: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users?action=login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const json = await response.json();

      if (json.status === 'success') {
        const rawRole = (json.data.role || '').toUpperCase();
        // Pemetaan nama role (jika di DB namanya 'FRON' / 'FRONT', kita jadikan 'FRONTDESK')
        let assignedRole: Role = rawRole as Role;
        if (rawRole === 'FRONT' || rawRole === 'FRON') {
          assignedRole = 'FRONTDESK';
        } else if (rawRole === 'SUPERVISOR') {
          assignedRole = 'SUPERVISOR';
        }
        
        await AsyncStorage.setItem('@user', JSON.stringify(json.data));
        await AsyncStorage.setItem('@role', assignedRole as string);

        setUser(json.data);
        setRole(assignedRole);
      } else {
        throw new Error(json.message || 'Login gagal');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('@user');
    await AsyncStorage.removeItem('@role');
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
