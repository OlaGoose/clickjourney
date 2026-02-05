'use client';

import { memo } from 'react';
import { SocialLoginButton } from './social-login-button';

/** 图标与文字间距，符合可点击区域与视觉呼吸感 */
const ICON_TEXT_GAP = '10px';

const contentBoxStyle: React.CSSProperties = {
  display: 'flex',
  textAlign: 'center',
  justifyContent: 'center',
  alignItems: 'center',
  gap: ICON_TEXT_GAP,
};

interface SocialLoginSectionProps {
  onEmailLogin: () => void;
  disabled?: boolean;
}

export const SocialLoginSection = memo<SocialLoginSectionProps>(function SocialLoginSection({
  onEmailLogin,
  disabled = false,
}) {
  return (
    <div>
      {/* Google */}
      <SocialLoginButton disabled={disabled}>
        <div style={contentBoxStyle}>
          <svg
            aria-hidden="true"
            role="graphics-symbol"
            viewBox="0.99 0.99 18.01 18.01"
            style={{
              width: '16px',
              height: '16px',
              display: 'block',
              fill: 'inherit',
              flexShrink: 0,
            }}
          >
            <g clipPath="url(#clip0_2234_44729)">
              <path
                fill="#4285F4"
                d="M18.64 10.205q-.002-.958-.164-1.841H10v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615"
              />
              <path
                fill="#34A853"
                d="M10 19c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H1.957v2.332A9 9 0 0 0 10 19"
              />
              <path
                fill="#FBBC04"
                d="M4.964 11.71A5.4 5.4 0 0 1 4.682 10c0-.593.102-1.17.282-1.71V5.958H1.957A9 9 0 0 0 1 10c0 1.452.348 2.827.957 4.042z"
              />
              <path
                fill="#E94235"
                d="M10 4.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C14.463 1.891 12.426.999 10 .999a9 9 0 0 0-8.043 4.958L4.964 8.29C5.672 6.163 7.656 4.58 10 4.58"
              />
            </g>
            <defs>
              <clipPath id="clip0_2234_44729">
                <path fill="#fff" d="M1 1h18v18H1z" />
              </clipPath>
            </defs>
          </svg>
          <div style={{ fontSize: '17px', lineHeight: '22px', fontWeight: 500 }}>
            Continue with Google
          </div>
        </div>
      </SocialLoginButton>

      {/* Apple */}
      <SocialLoginButton disabled={disabled}>
        <div style={contentBoxStyle}>
          <svg
            aria-hidden="true"
            role="graphics-symbol"
            viewBox="2.67 0.99 14.65 18.01"
            style={{
              width: '16px',
              height: '16px',
              display: 'block',
              fill: 'inherit',
              flexShrink: 0,
            }}
          >
            <path d="M13.295 5.348q.19 0 .59.045.41.036.928.2.52.164 1.055.528.537.363.992 1.018-.046.028-.346.246a5 5 0 0 0-.664.637 3.9 3.9 0 0 0-.655 1.046q-.272.627-.272 1.5 0 1.001.345 1.692.355.692.819 1.119.473.427.837.628.373.19.4.2-.01.036-.137.409-.127.364-.4.946a8.4 8.4 0 0 1-.691 1.2q-.39.555-.81 1.065a3.8 3.8 0 0 1-.9.827 1.9 1.9 0 0 1-1.091.328 2.5 2.5 0 0 1-.792-.11 5 5 0 0 1-.627-.254 5 5 0 0 0-.646-.246 3 3 0 0 0-.882-.109q-.691 0-1.156.182-.454.192-.864.373a2.4 2.4 0 0 1-.964.182q-.845 0-1.491-.673a16 16 0 0 1-1.31-1.61q-.519-.745-.946-1.719a12 12 0 0 1-.682-2.065 9.6 9.6 0 0 1-.255-2.183q0-1.746.664-2.937.665-1.192 1.7-1.801 1.037-.61 2.157-.61.591 0 1.11.191.526.192.981.391.456.192.828.191.355 0 .837-.2.482-.21 1.064-.418a3.8 3.8 0 0 1 1.273-.21m-.637-1.474q-.455.555-1.146.919-.683.364-1.292.364-.128 0-.245-.028l-.028-.127a2 2 0 0 1-.009-.2q0-.691.3-1.346t.692-1.092q.481-.573 1.219-.955.746-.38 1.428-.409.027.154.027.355 0 .7-.264 1.364a4.3 4.3 0 0 1-.682 1.155" />
          </svg>
          <div style={{ fontSize: '17px', lineHeight: '22px', fontWeight: 500 }}>
            Continue with Apple
          </div>
        </div>
      </SocialLoginButton>

      {/* SSO */}
      <SocialLoginButton disabled={disabled}>
        <div style={contentBoxStyle}>
          <svg
            aria-hidden="true"
            role="graphics-symbol"
            viewBox="1.9 3.24 16.21 14.18"
            style={{
              width: '16px',
              height: '16px',
              display: 'block',
              fill: 'inherit',
              flexShrink: 0,
            }}
          >
            <path d="M6.625 6.625a.675.675 0 1 1-1.35 0 .675.675 0 0 1 1.35 0M5.95 9.55a.675.675 0 1 0 0-1.35.675.675 0 0 0 0 1.35m.675 1.575a.675.675 0 1 1-1.35 0 .675.675 0 0 1 1.35 0M9.1 7.3a.675.675 0 1 0 0-1.35.675.675 0 0 0 0 1.35m.675 1.575a.675.675 0 1 1-1.35 0 .675.675 0 0 1 1.35 0M9.1 11.8a.675.675 0 1 0 0-1.35.675.675 0 0 0 0 1.35m6.413.225a.675.675 0 1 1-1.35 0 .675.675 0 0 1 1.35 0m-.675 2.925a.675.675 0 1 0 0-1.35.675.675 0 0 0 0 1.35" />
            <path d="M1.9 5.725A2.475 2.475 0 0 1 4.375 3.25h6.3a2.475 2.475 0 0 1 2.475 2.475v3.15h2.475A2.475 2.475 0 0 1 18.1 11.35v5.4a.675.675 0 0 1-.675.675H2.575a.675.675 0 0 1-.675-.675zM4.375 4.6c-.621 0-1.125.504-1.125 1.125v10.35h1.913V13.6c0-.31.251-.562.562-.562h3.6c.31 0 .563.251.563.562v2.475H11.8V5.725c0-.621-.504-1.125-1.125-1.125zm4.388 11.475v-1.912H6.288v1.912zm4.387-5.85v5.85h3.6V11.35c0-.621-.504-1.125-1.125-1.125z" />
          </svg>
          <div style={{ fontSize: '17px', lineHeight: '22px', fontWeight: 500 }}>
            Single sign-on (SSO)
          </div>
        </div>
      </SocialLoginButton>

      {/* Email */}
      <SocialLoginButton onClick={onEmailLogin} disabled={disabled}>
        <div style={contentBoxStyle}>
          <svg
            aria-hidden="true"
            role="graphics-symbol"
            viewBox="2.37 4.12 15.25 11.75"
            style={{
              width: '16px',
              height: '16px',
              display: 'block',
              fill: 'inherit',
              flexShrink: 0,
            }}
          >
            <path d="M2.375 6.25c0-1.174.951-2.125 2.125-2.125h11c1.174 0 2.125.951 2.125 2.125v7.5a2.125 2.125 0 0 1-2.125 2.125h-11a2.125 2.125 0 0 1-2.125-2.125zm1.25 7.49L7.366 10 3.625 6.259zm.884.885H15.49l-3.74-3.741-1.309 1.308a.625.625 0 0 1-.884 0L8.25 10.884zM12.634 10l3.741 3.741V6.26zM4.509 5.375 10 10.866l5.491-5.491z" />
          </svg>
          <div style={{ fontSize: '17px', lineHeight: '22px', fontWeight: 500 }}>
            Continue with Email
          </div>
        </div>
      </SocialLoginButton>
    </div>
  );
});
