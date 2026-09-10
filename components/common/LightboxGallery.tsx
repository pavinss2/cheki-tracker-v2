'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';
import { extractDirectImageUrl } from '@/lib/imageUtils';

export interface LightboxItem {
  url: string;
  title?: string;
  subtitle?: string;
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

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Top Bar Header */}
        <div className="lightbox-header">
          <div className="lightbox-info">
            <span className="lightbox-counter">
              Image {currentIndex + 1} of {items.length}
            </span>
            {currentItem.title && <span className="lightbox-title">• {currentItem.title}</span>}
            {currentItem.subtitle && <span className="lightbox-sub">({currentItem.subtitle})</span>}
          </div>
          <button className="btn-close-lightbox" onClick={onClose} title="Close Lightbox (Esc)">
            <X size={22} />
          </button>
        </div>

        {/* Main Image Area with Previous / Next Arrows */}
        <div className="lightbox-body">
          {items.length > 1 && (
            <button className="nav-arrow left" onClick={handlePrev} title="Previous Image (Left Arrow)">
              <ChevronLeft size={32} />
            </button>
          )}

          <div className="image-display-box">
            {!imgError && cleanUrl ? (
              /* eslint-disable-next-next/no-img-element */
              <img
                src={cleanUrl}
                alt={currentItem.title || 'Cheki Photo'}
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

          {items.length > 1 && (
            <button className="nav-arrow right" onClick={handleNext} title="Next Image (Right Arrow)">
              <ChevronRight size={32} />
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .lightbox-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(10, 11, 16, 0.92);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .lightbox-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 1000px;
          max-height: 90vh;
          background-color: #161822;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.7);
        }

        .lightbox-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          background-color: #10121a;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .lightbox-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: var(--text-main);
        }

        .lightbox-counter {
          font-weight: 700;
          color: var(--accent-primary);
        }

        .lightbox-title {
          font-weight: 600;
        }

        .lightbox-sub {
          color: var(--text-muted);
          font-size: 0.82rem;
        }

        .btn-close-lightbox {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          &:hover { color: #fff; background: rgba(255,255,255,0.1); }
        }

        .lightbox-body {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          min-height: 400px;
          flex: 1;
        }

        .image-display-box {
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: 100%;
          max-height: 75vh;
        }

        .lightbox-image {
          max-width: 100%;
          max-height: 75vh;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        }

        .nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(24, 27, 38, 0.85);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          transition: background 0.2s, transform 0.2s;
          &:hover {
            background: var(--accent-primary);
            color: #000;
            transform: translateY(-50%) scale(1.08);
          }
        }

        .nav-arrow.left { left: 16px; }
        .nav-arrow.right { right: 16px; }

        .broken-image-card {
          padding: 40px 20px;
          text-align: center;
          color: var(--text-muted);
          h3 { color: var(--text-main); font-size: 1.1rem; margin-bottom: 6px; }
          p { font-size: 0.88rem; max-width: 400px; margin: 0 auto; }
        }

        @media (max-width: 600px) {
          .nav-arrow.left { left: 8px; width: 38px; height: 38px; }
          .nav-arrow.right { right: 8px; width: 38px; height: 38px; }
        }
      `}</style>
    </div>
  );
};
