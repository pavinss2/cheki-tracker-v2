'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';
import { extractDirectImageUrl } from '@/lib/imageUtils';

export interface LightboxItem {
  url: string;
  title?: string;
  subtitle?: string;
  date?: string;
  qty?: number;
  members?: string[];
  event?: string;
}

interface LightboxGalleryProps {
  items: LightboxItem[];
  initialIndex?: number;
  onClose: () => void;
}

export const LightboxGallery: React.FC<LightboxGalleryProps> = ({
  items,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imgError, setImgError] = useState(false);

  const currentItem = items[currentIndex] || items[0];
  const cleanUrl = extractDirectImageUrl(currentItem?.url);

  const handlePrev = useCallback(() => {
    setImgError(false);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const handleNext = useCallback(() => {
    setImgError(false);
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  // Keyboard Navigation: ArrowLeft / ArrowRight / Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  if (!items || items.length === 0 || !currentItem) return null;

  // Extract caption labels
  const membersText = currentItem.members && currentItem.members.length > 0
    ? (currentItem.members.length > 9 ? `${currentItem.members.slice(0, 9).join(', ')} +${currentItem.members.length - 9}` : currentItem.members.join(', '))
    : (currentItem.title || '');

  const eventText = currentItem.event || currentItem.subtitle || '';
  const dateText = currentItem.date || '';
  const qtyText = currentItem.qty ? `${currentItem.qty} cheki` : '';

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      {/* Floating Top-Right Close Button */}
      <button className="lightbox-close-btn" onClick={onClose} title="Close Lightbox (Esc)">
        <X size={20} />
      </button>

      {/* Main Center Image */}
      <div className="lightbox-image-wrapper" onClick={(e) => e.stopPropagation()}>
        {!imgError && cleanUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cleanUrl}
            alt={membersText || 'Cheki Photo'}
            onError={() => setImgError(true)}
            className="lightbox-image"
          />
        ) : (
          <div className="broken-image-card">
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📷</div>
            <h3>Image Preview Restricted</h3>
            <p>Direct embedding blocked by photo host (e.g. Google Drive/Photos restriction).</p>
            {currentItem.url && (
              <a
                href={currentItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                Open Original Photo <ExternalLink size={16} />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Floating Left Arrow */}
      {items.length > 1 && (
        <button
          className="lightbox-nav-btn left"
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          title="Previous Image (Left Arrow)"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Floating Right Arrow */}
      {items.length > 1 && (
        <button
          className="lightbox-nav-btn right"
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          title="Next Image (Right Arrow)"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Floating Bottom Translucent Glass Pill Bar */}
      <div className="lightbox-bottom-bar" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox-caption-primary">
          <span className="lightbox-members-gold">{membersText || 'Cheki Photo'}</span>
          {eventText && <span className="lightbox-dash"> — </span>}
          {eventText && <span className="lightbox-event-name">{eventText}</span>}
        </div>
        <div className="lightbox-caption-secondary">
          {dateText && <span>{dateText}</span>}
          {dateText && qtyText && <span> · </span>}
          {qtyText && <span>{qtyText}</span>}
          <span> ({currentIndex + 1}/{items.length})</span>
        </div>
      </div>

      <style jsx>{`
        .lightbox-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(5, 6, 10, 0.94);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .lightbox-close-btn {
          position: fixed;
          top: 20px;
          right: 24px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(30, 34, 48, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10001;
          transition: background 0.2s, transform 0.2s;
        }

        .lightbox-close-btn:hover {
          background: rgba(212, 168, 75, 0.85);
          color: #000000;
          transform: scale(1.08);
        }

        .lightbox-image-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: 88vw;
          max-height: 78vh;
        }

        .lightbox-image {
          max-width: 88vw;
          max-height: 78vh;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.85);
          border: 1px solid rgba(212, 168, 75, 0.2);
        }

        .lightbox-nav-btn {
          position: fixed;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(30, 34, 48, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10001;
          transition: background 0.2s, transform 0.2s;
        }

        .lightbox-nav-btn:hover {
          background: var(--accent-primary);
          color: #000000;
          transform: translateY(-50%) scale(1.1);
        }

        .lightbox-nav-btn.left { left: 24px; }
        .lightbox-nav-btn.right { right: 24px; }

        .lightbox-bottom-bar {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10001;
          background: rgba(22, 25, 36, 0.82);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 14px;
          padding: 10px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          box-shadow: 0 10px 35px rgba(0, 0, 0, 0.65);
          max-width: 90vw;
          text-align: center;
        }

        .lightbox-caption-primary {
          font-size: 0.95rem;
          line-height: 1.3;
        }

        .lightbox-members-gold {
          color: var(--accent-primary);
          font-weight: 700;
        }

        .lightbox-dash {
          color: var(--text-muted);
          margin: 0 4px;
        }

        .lightbox-event-name {
          color: var(--text-main);
          font-weight: 500;
        }

        .lightbox-caption-secondary {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .broken-image-card {
          padding: 40px 24px;
          text-align: center;
          color: var(--text-muted);
          background: rgba(20, 22, 32, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }

        .broken-image-card h3 {
          color: var(--text-main);
          font-size: 1.1rem;
          margin-bottom: 6px;
        }

        .broken-image-card p {
          font-size: 0.88rem;
          max-width: 400px;
          margin: 0 auto;
        }

        @media (max-width: 600px) {
          .lightbox-nav-btn.left { left: 12px; width: 38px; height: 38px; }
          .lightbox-nav-btn.right { right: 12px; width: 38px; height: 38px; }
          .lightbox-close-btn { top: 14px; right: 14px; width: 36px; height: 36px; }
          .lightbox-bottom-bar { bottom: 16px; padding: 8px 16px; width: 92vw; }
          .lightbox-caption-primary { font-size: 0.86rem; }
          .lightbox-caption-secondary { font-size: 0.75rem; }
        }
      `}</style>
    </div>
  );
};

