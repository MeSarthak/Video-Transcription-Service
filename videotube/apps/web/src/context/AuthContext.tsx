import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { User, ApiResponse } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<User>>('/auth/me');
      return response.data.data;
    },
    retry: false, // Don't retry if not logged in
  });

  useEffect(() => {
    if (data && !isError) {
      setUser(data);
    } else {
      setUser(null);
    }
  }, [data, isError]);

  const login = (newUser: User) => {
    setUser(newUser);
    queryClient.setQueryData(['currentUser'], newUser);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setUser(null);
      queryClient.setQueryData(['currentUser'], null);
      queryClient.clear(); // Clear all cached data
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
