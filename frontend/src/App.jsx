/**
 * Main App Component
 * Handles routing and application structure
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useCharacterStore } from './state/characterSlice';

// Common Components
import Navigation from './components/Navigation';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import { TutorialProvider } from './contexts/TutorialContext';

// Lazy load pages for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const CharacterSelect = lazy(() => import('./pages/CharacterSelect'));
const CharacterCreation = lazy(() => import('./features/character-creation/CharacterCreation'));
const GameWorld = lazy(() => import('./pages/GameWorld'));
const QuestLog = lazy(() => import('./features/quests/QuestLog'));
const GalaxyMap = lazy(() => import('./pages/GalaxyMap'));
const PlanetSurface = lazy(() => import('./pages/PlanetSurface'));
const SubMapView = lazy(() => import('./pages/SubMapView'));
const NPCBrowser = lazy(() => import('./pages/NPCBrowser'));
const InventoryView = lazy(() => import('./features/inventory/InventoryView'));
const FactionView = lazy(() => import('./features/factions/FactionView'));
const TradingView = lazy(() => import('./features/trading/TradingView'));
const CraftingView = lazy(() => import('./features/crafting/CraftingView'));
const ExplorationJournal = lazy(() => import('./features/exploration/ExplorationJournal'));
const CombatView = lazy(() => import('./features/combat/CombatView'));

function App() {
  const { currentCharacter } = useCharacterStore();

  return (
    <ErrorBoundary>
      <TutorialProvider>
        <div className="app">
          {currentCharacter && <Navigation />}
          
          <Suspense fallback={<LoadingSpinner fullScreen message="Loading game..." />}>
          <Routes>
        {/* Landing page */}
        <Route path="/" element={<Landing />} />
        
        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Character management (require auth) */}
        <Route 
          path="/character/select" 
          element={
            <ProtectedRoute>
              <CharacterSelect />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/character/create" 
          element={
            <ProtectedRoute>
              <CharacterCreation />
            </ProtectedRoute>
          } 
        />
        
        {/* Game routes (require auth and character) */}
        <Route 
          path="/game" 
          element={
            <ProtectedRoute>
              {currentCharacter ? <GameWorld /> : <Navigate to="/character/select" />}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game/quests" 
          element={
            <ProtectedRoute>
              {currentCharacter ? <QuestLog /> : <Navigate to="/character/select" />}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game/galaxy" 
          element={
            <ProtectedRoute>
              {currentCharacter ? <GalaxyMap /> : <Navigate to="/character/select" />}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game/planet/:planetId" 
          element={
            <ProtectedRoute>
              {currentCharacter ? <PlanetSurface /> : <Navigate to="/character/select" />}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game/location/:planetId/:parentLocationId/:parentLocationType/:type" 
          element={
            <ProtectedRoute>
              {currentCharacter ? <SubMapView /> : <Navigate to="/character/select" />}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game/submap/:subMapId" 
          element={
            <ProtectedRoute>
              {currentCharacter ? <SubMapView /> : <Navigate to="/character/select" />}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game/npcs" 
          element={
            <ProtectedRoute>
              {currentCharacter ? <NPCBrowser /> : <Navigate to="/character/select" />}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game/inventory" 
          element={
            <ProtectedRoute>
              {currentCharacter ? <InventoryView /> : <Navigate to="/character/select" />}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game/factions" 
          element={
            <ProtectedRoute>
              {currentCharacter ? <FactionView /> : <Navigate to="/character/select" />}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game/vendor/:npcId" 
          element={
            <ProtectedRoute>
              {currentCharacter ? <TradingView /> : <Navigate to="/character/select" />}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game/crafting" 
          element={
            <ProtectedRoute>
              {currentCharacter ? <CraftingView /> : <Navigate to="/character/select" />}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game/exploration" 
          element={
            <ProtectedRoute>
              {currentCharacter ? <ExplorationJournal /> : <Navigate to="/character/select" />}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game/combat/:encounterId?" 
          element={
            <ProtectedRoute>
              {currentCharacter ? <CombatView /> : <Navigate to="/character/select" />}
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
        </div>
      </TutorialProvider>
    </ErrorBoundary>
  );
}

export default App;
