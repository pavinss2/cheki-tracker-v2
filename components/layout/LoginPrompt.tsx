'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogIn, Sparkles, Lock } from 'lucide-react';

export const LoginPrompt: React.FC = () => {
  const { signInWithGoogle, enableDemoMode } = useAuth();

  return (
    <div className="login-card card">
      <div className="icon-badge">
        <Lock size={28} />
      </div>
      <h2>Sign in to Access Your Cheki Tracker</h2>
      <p>Your transactions and analytics are private and mapped directly to your account. Sign in with Google to view and manage your cheki collection.</p>

      <div className="actions">
        <button className="btn btn-primary" onClick={signInWithGoogle}>
          <LogIn size={18} />
          <span>Sign in with Google</span>
        </button>

        <button className="btn btn-secondary" onClick={enableDemoMode}>
          <Sparkles size={16} />
          <span>Try Live Demo Mode</span>
        </button>
      </div>

      <style jsx>{`
        .login-card {
          max-width: 500px;
          margin: 60px auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 40px 24px;
        }

        .icon-badge {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        h2 {
          font-size: 1.4rem;
        }

        p {
          color: var(--text-muted);
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 280px;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
};
