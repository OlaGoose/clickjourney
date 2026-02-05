'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  XMarkIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  StarIcon,
  BookmarkIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { useAuth, useAuthGuard } from '@/lib/auth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  badge?: string;
  isDestructive?: boolean;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, profile, signOut, isAuthenticated } = useAuth();
  const { redirectToAuth } = useAuthGuard();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (e) {
      console.error('Sign out error:', e);
    }
  };

  const displayName =
    profile?.username ||
    user?.email?.split('@')[0] ||
    'User';
  const avatarUrl = profile?.avatar_url ?? null;

  const menuItems: SidebarItem[] = [
    { id: 'profile', label: 'Profile', icon: UserIcon, href: '/profile' },
    { id: 'journey', label: 'My Journey', icon: MapPinIcon, href: '/' },
    { id: 'premium', label: 'Premium', icon: StarIcon, href: '/premium', badge: 'Soon' },
    { id: 'bookmarks', label: 'Bookmarks', icon: BookmarkIcon, href: '/bookmarks' },
    { id: 'settings', label: 'Settings', icon: Cog6ToothIcon, href: '/settings' },
    { id: 'divider', label: '', icon: () => null },
    {
      id: 'logout',
      label: 'Log out',
      icon: ArrowRightOnRectangleIcon,
      onClick: handleSignOut,
      isDestructive: true,
    },
  ];

  function SidebarItemRow({ item }: { item: SidebarItem }) {
    const Icon = item.icon;
    if (item.id === 'divider') {
      return <div className="mx-4 my-2 h-px bg-white/20" />;
    }
    return (
      <motion.a
        href={item.href}
        onClick={(e) => {
          if (item.onClick) {
            e.preventDefault();
            item.onClick!();
          }
        }}
        className={`flex items-center gap-4 px-4 py-3 text-[#f5f5f7] transition-colors hover:bg-white/10 ${
          item.isDestructive ? 'text-red-400 hover:bg-red-500/20' : ''
        }`}
        whileHover={{ x: 6 }}
        whileTap={{ scale: 0.98 }}
      >
        <Icon
          className={`h-5 w-5 ${
            item.isDestructive ? 'text-red-400' : 'text-[#a1a1a6]'
          }`}
        />
        <span className="flex-1 text-lg font-medium">{item.label}</span>
        {item.badge && (
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
            {item.badge}
          </span>
        )}
      </motion.a>
    );
  }

  if (!mounted) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            ref={sidebarRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 z-50 flex h-full max-h-[100dvh] w-80 max-w-[85vw] flex-col bg-black/95 shadow-2xl backdrop-blur-xl"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="flex shrink-0 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 shadow-lg">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-[#f5f5f7]">
                    {displayName}
                  </p>
                  <p className="truncate text-[#a1a1a6]">
                    @{profile?.username || user?.email?.split('@')[0] || 'user'}
                  </p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              {menuItems.map((item) => (
                <SidebarItemRow key={item.id} item={item} />
              ))}
            </div>

            <div className="shrink-0 px-4 pb-4">
              <motion.div
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10">
                    <span className="text-lg font-bold text-white">Orbit</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-bold text-[#f5f5f7]">
                      Your journey, one place.
                    </h3>
                    <p className="text-sm text-[#a1a1a6]">
                      Memories and places in one app.
                    </p>
                  </div>
                </div>
                <motion.button
                  type="button"
                  className="w-full rounded-xl bg-white py-3 px-4 text-base font-semibold text-black transition-colors hover:bg-white/90"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Get the app
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
