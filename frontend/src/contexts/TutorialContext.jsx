/**
 * Tutorial Context
 * React context for tutorial state management
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useCharacterStore } from '../state/characterSlice';
import TutorialStateMachine, { TUTORIAL_STATES } from '../services/tutorialStateMachine';
import { tutorialApi } from '../services/api/tutorialApi';

const TutorialContext = createContext(null);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
};

export const TutorialProvider = ({ children }) => {
  const { currentCharacter } = useCharacterStore();
  const [stateMachine, setStateMachine] = useState(null);
  const [currentState, setCurrentState] = useState(TUTORIAL_STATES.NOT_STARTED);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tutorialProgress, setTutorialProgress] = useState(null);
  
  // Initialize tutorial when character changes
  useEffect(() => {
    if (!currentCharacter) {
      setIsLoading(false);
      return;
    }
    
    const initTutorial = async () => {
      try {
        setIsLoading(true);
        
        // Create state machine
        const machine = new TutorialStateMachine(currentCharacter.id);
        await machine.initialize();
        
        // Setup state change listener
        machine.on('stateChanged', ({ newState }) => {
          console.log('[TutorialContext] State changed to:', newState);
          setCurrentState(newState);
          const active = machine.isActive();
          setIsActive(active);
          console.log('[TutorialContext] Tutorial active:', active);
        });
        
        setStateMachine(machine);
        
        // Load tutorial progress and sync state
        try {
          const response = await tutorialApi.getState(currentCharacter.id);
          if (response.success && response.data) {
            setTutorialProgress(response.data);
            // Sync state machine with backend state
            const backendState = response.data.state;
            const currentMachineState = machine.getState();
            
            // Only sync if backend state is different and not not_started (to prevent reset)
            // If backend is not_started but machine is already in a later state, don't reset
            if (backendState && backendState !== currentMachineState) {
              // Don't reset to not_started if we're already in a later state
              if (backendState === 'not_started' && currentMachineState !== 'not_started') {
                console.log('[TutorialProvider] Backend state is not_started but machine is in', currentMachineState, '- not resetting');
                // Don't reset - keep current state
              } else {
                console.log('[TutorialProvider] Syncing state machine with backend:', backendState);
                machine.currentState = backendState;
                machine.completedStates = new Set(response.data.completedStates || []);
                machine.milestones = response.data.milestones || {};
                
                // Trigger state change notification to update UI
                machine.notifyListeners('stateChanged', {
                  oldState: currentMachineState,
                  newState: backendState
                });
              }
            }
          }
        } catch (error) {
          console.error('[TutorialProvider] Failed to load tutorial progress:', error);
        }
        
        // Update UI state after syncing
        const currentMachineState = machine.getState();
        const machineIsActive = machine.isActive();
        setCurrentState(currentMachineState);
        setIsActive(machineIsActive);
        console.log('[TutorialProvider] Initial state:', currentMachineState, 'Active:', machineIsActive);
        
        setIsLoading(false);
      } catch (error) {
        console.error('[TutorialProvider] Failed to initialize tutorial:', error);
        setIsLoading(false);
      }
    };
    
    initTutorial();
    
    // Cleanup
    return () => {
      if (stateMachine) {
        stateMachine.destroy();
      }
    };
  }, [currentCharacter?.id]);
  
  // Start tutorial
  const startTutorial = useCallback(async () => {
    if (!stateMachine) {
      console.warn('[TutorialContext] State machine not ready, waiting...');
      // Wait a bit and try again
      setTimeout(async () => {
        if (stateMachine) {
          await stateMachine.start();
          // Don't sync - the start() method already handles state updates
        }
      }, 500);
      return;
    }
    await stateMachine.start();
    // Don't sync again - the start() method already handles state updates
    // The state machine's start() method will notify listeners with the correct state
  }, [stateMachine, currentCharacter]);
  
  // Complete tutorial
  const completeTutorial = useCallback(async () => {
    if (!stateMachine) return;
    await stateMachine.complete();
  }, [stateMachine]);
  
  // Skip tutorial
  const skipTutorial = useCallback(async () => {
    if (!stateMachine) return;
    await stateMachine.skip();
  }, [stateMachine]);
  
  // Transition to state
  const transitionTo = useCallback(async (state, data) => {
    if (!stateMachine) return;
    await stateMachine.transitionTo(state, data);
  }, [stateMachine]);
  
  // Complete step
  const completeStep = useCallback(async (stepId, stepData) => {
    if (!stateMachine) return;
    await stateMachine.completeStep(stepId, stepData);
  }, [stateMachine]);
  
  const value = {
    // State
    currentState,
    isActive,
    isLoading,
    tutorialProgress,
    stateMachine,
    
    // Actions
    startTutorial,
    completeTutorial,
    skipTutorial,
    transitionTo,
    completeStep,
    
    // Helpers
    isStateCompleted: (state) => stateMachine?.isStateCompleted(state) || false,
    getState: () => stateMachine?.getState() || TUTORIAL_STATES.NOT_STARTED
  };
  
  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

