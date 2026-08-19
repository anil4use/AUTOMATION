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
  isLoadingSession: boolean;
  setRole: (role: UserRole) => void;
  toggleRole: () => void;
  login: (email: string, role: UserRole, name?: string, userId?: string, organizationId?: string, realToken?: string) => void;
  logout: () => void;
}

/** Cookie utility helpers for cross-refresh persistence */
export function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

/** Decodes the organizationId from a real JWT payload */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64Payload = token.split('.')[1];
    if (!base64Payload) return null;
    const decoded = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

const unauthenticatedUser: UserProfile = {
  userId: '',
  name: '',
  email: '',
  role: 'user',
  organizationId: '',
  isAuthenticated: false,
};

const UserRoleContext = createContext<UserRoleContextType>({
  user: unauthenticatedUser,
  isLoadingSession: true,
  setRole: () => {},
  toggleRole: () => {},
  login: () => {},
  logout: () => {},
});

export const UserRoleProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile>(unauthenticatedUser);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('token') || getCookie('token');
      const savedEmail = localStorage.getItem('user_email') || getCookie('user_email');
      const savedName = localStorage.getItem('user_name') || getCookie('user_name');
      const savedRole = (localStorage.getItem('autoflow_user_role') || getCookie('autoflow_user_role')) as UserRole;
      const savedUserId = localStorage.getItem('user_id') || getCookie('user_id');
      const savedOrgId = localStorage.getItem('organization_id') || getCookie('organization_id');

      if (savedToken && savedEmail) {
        const decoded = decodeJwtPayload(savedToken);
        const orgId = decoded?.organizationId || savedOrgId || '';
        const userId = decoded?.userId || savedUserId || '';

        setUser({
          userId,
          name: savedName || savedEmail.split('@')[0],
          email: savedEmail,
          role: savedRole === 'user' ? 'user' : 'admin',
          organizationId: orgId,
          isAuthenticated: true,
        });

        // Ensure both cookies & localStorage remain in sync
        setCookie('token', savedToken);
        setCookie('user_email', savedEmail);
        setCookie('user_name', savedName || savedEmail.split('@')[0]);
        setCookie('autoflow_user_role', savedRole || 'admin');
        if (userId) setCookie('user_id', userId);
        if (orgId) setCookie('organization_id', orgId);
      } else {
        setUser(unauthenticatedUser);
      }
    } catch (e) {
      console.error('Session restoration error:', e);
      setUser(unauthenticatedUser);
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  const login = (
    email: string,
    role: UserRole,
    name?: string,
    userId?: string,
    organizationId?: string,
    realToken?: string
  ) => {
    const formattedName = name || email.split('@')[0];
    const updatedUser: UserProfile = {
      userId: userId || '',
      name: formattedName,
      email,
      role,
      organizationId: organizationId || '',
      isAuthenticated: true,
    };
    setUser(updatedUser);
    setIsLoadingSession(false);

    try {
      if (realToken) {
        localStorage.setItem('token', realToken);
        setCookie('token', realToken);
      }
      localStorage.setItem('user_email', email);
      setCookie('user_email', email);

      localStorage.setItem('user_name', formattedName);
      setCookie('user_name', formattedName);

      localStorage.setItem('autoflow_user_role', role);
      setCookie('autoflow_user_role', role);

      if (userId) {
        localStorage.setItem('user_id', userId);
        setCookie('user_id', userId);
      }
      if (organizationId) {
        localStorage.setItem('organization_id', organizationId);
        setCookie('organization_id', organizationId);
      }
    } catch (e) {
      console.error('Error saving session:', e);
    }
  };

  const logout = () => {
    setUser(unauthenticatedUser);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_id');
      localStorage.removeItem('organization_id');
      localStorage.removeItem('autoflow_user_role');

      deleteCookie('token');
      deleteCookie('user_email');
      deleteCookie('user_name');
      deleteCookie('user_id');
      deleteCookie('organization_id');
      deleteCookie('autoflow_user_role');
    } catch (e) {
      console.error(e);
    }
  };

  const setRole = (newRole: UserRole) => {
    setUser((prev) => ({ ...prev, role: newRole }));
    try {
      localStorage.setItem('autoflow_user_role', newRole);
      setCookie('autoflow_user_role', newRole);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleRole = () => {
    setRole(user.role === 'admin' ? 'user' : 'admin');
  };

  return (
    <UserRoleContext.Provider value={{ user, isLoadingSession, setRole, toggleRole, login, logout }}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => useContext(UserRoleContext);
