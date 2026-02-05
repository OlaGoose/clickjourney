'use client';

import { useState, memo } from 'react';

interface SocialLoginButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const SocialLoginButton = memo<SocialLoginButtonProps>(function SocialLoginButton({
  children,
  onClick,
  disabled = false,
  className = '',
}) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handlePress = () => {
    if (disabled) return;
    setIsPressed(true);
    if (navigator.vibrate) {
      navigator.vibrate(8);
    }
    setTimeout(() => setIsPressed(false), 80);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    handlePress();
    onClick?.();
  };

  const getButtonClasses = () => {
    const baseClasses =
      'select-none transition-all duration-120 cursor-pointer relative inline-flex items-center justify-center whitespace-nowrap h-11 rounded-xl text-[#f5f5f7] fill-current text-base leading-none px-4 font-semibold w-full mt-3 backdrop-blur-sm overflow-hidden';

    if (disabled) {
      return `${baseClasses} cursor-not-allowed opacity-60 bg-white/5 border border-white/20`;
    }

    if (isPressed) {
      return `${baseClasses} bg-white/10 border border-white/30 transform translate-y-0.5 scale-[0.98]`;
    }

    if (isHovered) {
      return `${baseClasses} bg-white/10 border border-white/30 -translate-y-0.5 scale-[1.005]`;
    }

    return `${baseClasses} border border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10`;
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={`${getButtonClasses()} ${className}`}
      onClick={handleClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => !disabled && setIsHovered(false)}
      onMouseDown={handlePress}
      onTouchStart={handlePress}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
      aria-disabled={disabled}
    >
      {/* 弹性光效背景 */}
      <div
        className={`absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/8 via-blue-500/4 to-blue-500/6 transition-opacity duration-120 pointer-events-none ${
          isHovered && !disabled ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {/* 按压涟漪效果 */}
      {isPressed && !disabled && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 animate-[ripple_200ms_cubic-bezier(0.25,0.46,0.45,0.94)]" />
      )}
      {children}
    </div>
  );
});
