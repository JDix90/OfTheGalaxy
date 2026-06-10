/**
 * Navigation Component
 * Main app navigation bar
 */

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../state/characterSlice';
import { useAuthStore } from '../state/authSlice';

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentCharacter, setCurrentCharacter } = useCharacterStore();
  const { logout: authLogout, user } = useAuthStore();

  const handleLogout = () => {
    setCurrentCharacter(null);
    authLogout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="main-navigation">
      <div className="nav-brand">
        <Link to="/game">Of the Galaxy</Link>
      </div>

      <div className="nav-links">
        <Link 
          to="/game" 
          className={isActive('/game') ? 'active' : ''}
        >
          Game
        </Link>
        <Link 
          to="/game/quests" 
          className={isActive('/game/quests') ? 'active' : ''}
        >
          Quests
        </Link>
        <Link 
          to="/game/factions" 
          className={isActive('/game/factions') ? 'active' : ''}
        >
          Factions
        </Link>
        <Link 
          to="/game/exploration" 
          className={isActive('/game/exploration') ? 'active' : ''}
        >
          Exploration
        </Link>
      </div>

      <div className="nav-user">
        {user && (
          <span className="user-email" title={user.email}>
            {user.email}
          </span>
        )}
        {currentCharacter && (
          <>
            <span className="user-info">
              {currentCharacter.name} (Lv. {currentCharacter.level})
            </span>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
