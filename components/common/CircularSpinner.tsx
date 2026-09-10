import React from 'react';

interface SpinnerProps {
  fullScreen?: boolean;
  size?: number;
}

export const CircularSpinner: React.FC<SpinnerProps> = ({ fullScreen = false, size = 44 }) => {
  return (
    <div className={`spinner-container ${fullScreen ? 'full-screen' : ''}`}>
      <div 
        className="circular-spinner" 
        style={{ width: `${size}px`, height: `${size}px` }} 
      />
    </div>
  );
};
