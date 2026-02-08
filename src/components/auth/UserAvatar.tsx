'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserIcon } from '@heroicons/react/24/outline';
import { useAuth, useAuthGuard, AUTH_REDIRECT_KEY } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  showDropdown?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

/** Icon is smaller than button for breathing room (Apple-style). */
const iconSizeClasses = {
  sm: 'h-[18px] w-[18px]',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function UserAvatar({
  size = 'md',
  showDropdown = false,
  className = '',
}: UserAvatarProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, profile, isAuthenticated } = useAuth();

  const handleAvatarClick = () => {
    if (showDropdown) setIsSidebarOpen(true);
  };

  const setRedirectAndGo = () => {
    if (typeof window !== 'undefined') {
      const current = window.location.pathname;
      if (current !== '/auth') sessionStorage.setItem(AUTH_REDIRECT_KEY, current);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <Link
        href="/auth"
        onClick={setRedirectAndGo}
        className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-white/[0.12] text-white/90 transition-[background-color,transform] duration-200 hover:bg-white/[0.18] hover:scale-[1.02] active:scale-[0.98] ${className}`}
        title="Sign in"
        aria-label="Sign in"
      >
        <UserIcon className={`${iconSizeClasses[size]} shrink-0 text-white/90`} />
      </Link>
    );
  }

  const displayName =
    profile?.username || user.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url ?? null;

  return (
    <>
      <button
        type="button"
        onClick={handleAvatarClick}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') handleAvatarClick();
        }}
        className={`min-w-[44px] min-h-[44px] p-2 -m-2 flex items-center justify-center rounded-full transition-[background-color,transform] duration-200 hover:bg-white/[0.18] hover:scale-[1.02] active:scale-[0.98] ${className}`}
        aria-label="Open menu"
      >
        <span className={`${sizeClasses[size]} flex items-center justify-center overflow-hidden rounded-full bg-white/[0.12]`}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className={`${textSizeClasses[size]} font-semibold text-white`}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
      </button>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </>
  );
}
