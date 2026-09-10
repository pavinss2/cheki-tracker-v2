'use client';

import React, { useState } from 'react';
import { extractDirectImageUrl } from '@/lib/imageUtils';

interface MemberAvatarProps {
  src?: string;
  name: string;
  size?: number;
  colorHex?: string;
  className?: string;
}

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  src,
  name,
  size = 32,
  colorHex = '#58a6ff',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const cleanUrl = extractDirectImageUrl(src);
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  const showFallback = !cleanUrl || hasError;

  return (
    <div 
      className={`member-avatar-container ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2px solid ${colorHex || 'rgba(255,255,255,0.15)'}`,
        backgroundColor: '#202433',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {!showFallback ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={cleanUrl}
          alt={name}
          onError={() => setHasError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <span 
          style={{
            fontSize: `${Math.round(size * 0.45)}px`,
            fontWeight: 700,
            color: '#ffffff',
            textTransform: 'uppercase',
            userSelect: 'none',
          }}
        >
          {initial}
        </span>
      )}
    </div>
  );
};
