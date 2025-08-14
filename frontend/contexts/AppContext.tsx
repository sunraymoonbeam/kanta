import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface AppState {
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
  currentEvent: {
    code: string | null;
    name: string | null;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    cameraQuality: 'low' | 'medium' | 'high';
    autoUpload: boolean;
  };
}

type AppAction =
  | { type: 'SET_USER'; payload: AppState['user'] }
  | { type: 'SET_CURRENT_EVENT'; payload: AppState['currentEvent'] }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<AppState['preferences']> }
  | { type: 'RESET_STATE' };

const initialState: AppState = {
  user: {
    id: null,
    name: null,
    email: null,
  },
  currentEvent: {
    code: null,
    name: null,
  },
  preferences: {
    theme: 'system',
    cameraQuality: 'high',
    autoUpload: true,
  },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_CURRENT_EVENT':
      return { ...state, currentEvent: action.payload };
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    setUser: (user: AppState['user']) => void;
    setCurrentEvent: (event: AppState['currentEvent']) => void;
    updatePreferences: (prefs: Partial<AppState['preferences']>) => void;
    resetState: () => void;
  };
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const actions = {
    setUser: (user: AppState['user']) => dispatch({ type: 'SET_USER', payload: user }),
    setCurrentEvent: (event: AppState['currentEvent']) => 
      dispatch({ type: 'SET_CURRENT_EVENT', payload: event }),
    updatePreferences: (prefs: Partial<AppState['preferences']>) =>
      dispatch({ type: 'UPDATE_PREFERENCES', payload: prefs }),
    resetState: () => dispatch({ type: 'RESET_STATE' }),
  };

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}