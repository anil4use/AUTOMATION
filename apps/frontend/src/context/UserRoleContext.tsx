'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  isAuthenticated: boolean;
}

interface UserRoleContextType {
  user: UserProfile;
  setRole: (role: UserRole) => void;
  toggleRole: () => void;
  login: (email: string, role: UserRole, name?: string) => void;
  logout: () => void;
}

const defaultUser: UserProfile = {
  userId: 'usr_9401',
  name: 'Anil Anuragee',
  email: 'anil.anuragee@aripratech.com',
  role: 'admin',
  organizationId: 'org_dev_123',
  isAuthenticated: true,
};

const UserRoleContext = createContext<UserRoleContextType>({
  user: defaultUser,
  setRole: () => {},
  toggleRole: () => {},
  login: () => {},
  logout: () => {},
});

export const UserRoleProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile>(defaultUser);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('token');
      const savedEmail = localStorage.getItem('user_email');
      const savedName = localStorage.getItem('user_name');
      const savedRole = localStorage.getItem('autoflow_user_role') as UserRole;

      if (savedToken && savedEmail) {
        setUser({
          userId: 'usr_custom',
          name: savedName || savedEmail.split('@')[0],
          email: savedEmail,
          role: savedRole === 'user' ? 'user' : 'admin',
          organizationId: 'org_dev_123',
          isAuthenticated: true,
        });
      } else if (!savedToken && typeof window !== 'undefined') {
        // In unauthenticated mode, initialize guest state
        setUser((prev) => ({
          ...prev,
          isAuthenticated: false,
        }));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const login = (email: string, role: UserRole, name?: string) => {
    const formattedName = name || email.split('@')[0];
    const updatedUser: UserProfile = {
      userId: `usr_${Date.now().toString().slice(-4)}`,
      name: formattedName,
      email,
      role,
      organizationId: 'org_dev_123',
      isAuthenticated: true,
    };
    setUser(updatedUser);
    try {
      localStorage.setItem('token', `jwt_token_${Date.now()}`);
      localStorage.setItem('user_email', email);
      localStorage.setItem('user_name', formattedName);
      localStorage.setItem('autoflow_user_role', role);
    } catch (e) {
      console.error(e);
    }
  };

  const logout = () => {
    setUser((prev) => ({ ...prev, isAuthenticated: false }));
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_name');
    } catch (e) {
      console.error(e);
    }
  };

  const setRole = (newRole: UserRole) => {
    setUser((prev) => ({ ...prev, role: newRole }));
    try {
      localStorage.setItem('autoflow_user_role', newRole);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleRole = () => {
    setRole(user.role === 'admin' ? 'user' : 'admin');
  };

  return (
    <UserRoleContext.Provider value={{ user, setRole, toggleRole, login, logout }}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => useContext(UserRoleContext);
