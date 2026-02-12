'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  StarIcon,
  BookmarkIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';

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
  const { user, profile, signOut } = useAuth();
  const { t } = useLocale();
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
    { id: 'profile', label: t('nav.profile'), icon: UserIcon, href: '/profile' },
    { id: 'journey', label: t('nav.myJourney'), icon: MapPinIcon, href: '/' },
    { id: 'premium', label: t('nav.premium'), icon: StarIcon, href: '/premium', badge: t('nav.soon') },
    { id: 'bookmarks', label: t('nav.bookmarks'), icon: BookmarkIcon, href: '/bookmarks' },
    { id: 'settings', label: t('nav.settings'), icon: Cog6ToothIcon, href: '/settings' },
    { id: 'divider', label: '', icon: () => null },
    {
      id: 'logout',
      label: t('nav.logOut'),
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

            {/* 底部推广卡片 - 一比一复刻 aha-lang 设计 */}
            <div className="shrink-0 px-4 pb-4">
              <motion.div
                className="relative overflow-hidden rounded-2xl border border-gray-200/20 bg-gradient-to-br from-gray-50/95 to-gray-100/95 p-4 shadow-xl backdrop-blur-md dark:border-gray-700/20 dark:from-gray-800/95 dark:to-gray-900/95"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                {/* 微妙的光泽效果 */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                {/* 产品信息头部 - 一比一复刻 aha-lang */}
                <div className="relative z-10 mb-4 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black shadow-xl">
                    <span className="text-2xl font-bold text-white">Orbit</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
                      {t('home.journeyMemory')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('home.getTheAppDescription')}
                    </p>
                  </div>
                </div>
                <div className="relative z-10 mb-4 grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>{t('home.realTimeUpdates')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span>{t('home.pushNotifications')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    <span>{t('home.offlineReading')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    <span>{t('home.darkMode')}</span>
                  </div>
                </div>
                <motion.button
                  type="button"
                  className="relative z-10 flex w-full items-center justify-center gap-2 rounded-xl bg-black px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  {t('home.getTheApp')}
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
