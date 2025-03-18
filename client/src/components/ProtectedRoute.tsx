import React from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '../hooks/use-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuth();

  // If user is not logged in, redirect to auth page
  if (!user) {
    return <Redirect to="/auth" />;
  }

  // If user's role is not in the allowed roles, redirect to home
  if (!allowedRoles.includes(user.role)) {
    return <Redirect to="/" />;
  }

  // If user is authenticated and authorized, render the children
  return <>{children}</>;
} 