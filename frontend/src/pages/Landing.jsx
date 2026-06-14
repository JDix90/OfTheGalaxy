/**
 * Landing Page
 * Entry point for the application
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../state/characterSlice';
import { useAuthStore } from '../state/authSlice';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const { currentCharacter } = useCharacterStore();
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Don't auto-redirect, let user choose to login or signup
    }
  }, [isAuthenticated, isLoading]);

  const handleStart = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (currentCharacter) {
      navigate('/game');
    } else {
      navigate('/character/select');
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleSignup = () => {
    navigate('/signup');
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        <h1>Of the Galaxy</h1>
        <p className="landing-subtitle">The Severed Reach</p>
        <p className="tagline">
          Cross the foldspace lanes of a shattered galaxy. Forge alliances. Uncover the truth.
        </p>

        <div className="landing-actions">
          {isAuthenticated ? (
            <button onClick={handleStart} className="btn-primary btn-large">
              {currentCharacter ? 'Continue Game' : 'Start Game'}
            </button>
          ) : (
            <>
              <button onClick={handleLogin} className="btn-primary btn-large">
                Login
              </button>
              <button onClick={handleSignup} className="btn-secondary btn-large">
                Sign Up
              </button>
            </>
          )}
        </div>

        <div className="landing-features">
          <div className="landing-feature">
            <span className="landing-feature-icon">🪐</span>
            <div className="landing-feature-title">Explore</div>
            <div className="landing-feature-text">Chart dozens of worlds across a fractured galaxy.</div>
          </div>
          <div className="landing-feature">
            <span className="landing-feature-icon">⚔️</span>
            <div className="landing-feature-title">Fight</div>
            <div className="landing-feature-text">Tactical, turn-based combat with real stakes.</div>
          </div>
          <div className="landing-feature">
            <span className="landing-feature-icon">🤝</span>
            <div className="landing-feature-title">Forge Alliances</div>
            <div className="landing-feature-text">Win factions, build relationships, shape your destiny.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
