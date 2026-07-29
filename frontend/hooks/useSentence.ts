'use client';

import { useState, useCallback } from 'react';

export interface SentenceState {
  sentence: string;
  sentence_rtl: string;
  words: string[];
  current_word: string;
  total_letters: number;
  avg_confidence: number;
  can_undo: boolean;
  can_redo: boolean;
}

export function useSentence() {
  const [state, setState] = useState<SentenceState>({
    sentence: '',
    sentence_rtl: '',
    words: [],
    current_word: '',
    total_letters: 0,
    avg_confidence: 0,
    can_undo: false,
    can_redo: false,
  });

  const addLetter = useCallback(async (letter: string, confidence: number) => {
    const response = await fetch('/api/v1/sentence/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letter, confidence }),
    });
    
    if (response.ok) {
      const data = await response.json();
      setState(data.state);
      return data.added;
    }
    return false;
  }, []);

  const addSpace = useCallback(async () => {
    const response = await fetch('/api/v1/sentence/space', {
      method: 'POST',
    });
    
    if (response.ok) {
      const data = await response.json();
      setState(data.state);
      return data.added;
    }
    return false;
  }, []);

  const undo = useCallback(async () => {
    const response = await fetch('/api/v1/sentence/undo', {
      method: 'POST',
    });
    
    if (response.ok) {
      const data = await response.json();
      setState(data.state);
      return data.success;
    }
    return false;
  }, []);

  const redo = useCallback(async () => {
    const response = await fetch('/api/v1/sentence/redo', {
      method: 'POST',
    });
    
    if (response.ok) {
      const data = await response.json();
      setState(data.state);
      return data.success;
    }
    return false;
  }, []);

  const clear = useCallback(async () => {
    const response = await fetch('/api/v1/sentence/reset', {
      method: 'POST',
    });
    
    if (response.ok) {
      const data = await response.json();
      setState(data.state);
    }
  }, []);

  const exportSentence = useCallback(async (format: 'json' | 'txt' = 'json') => {
    const response = await fetch('/api/v1/sentence/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  }, []);

  // Local state management for immediate UI updates
  const [localSentence, setLocalSentence] = useState('');
  const [localWords, setLocalWords] = useState<string[]>([]);
  const [localCurrentWord, setLocalCurrentWord] = useState('');
  const [localCanUndo, setLocalCanUndo] = useState(false);
  const [localCanRedo, setLocalCanRedo] = useState(false);

  const addLetterLocal = useCallback((letter: string) => {
    setLocalCurrentWord(prev => prev + letter);
    setLocalSentence(prev => prev + letter);
  }, []);

  const addSpaceLocal = useCallback(() => {
    if (localCurrentWord) {
      setLocalWords(prev => [...prev, localCurrentWord]);
      setLocalCurrentWord('');
      setLocalSentence(prev => prev + ' ');
    }
  }, [localCurrentWord]);

  const undoLocal = useCallback(() => {
    // Local undo implementation
  }, []);

  const clearLocal = useCallback(() => {
    setLocalSentence('');
    setLocalWords([]);
    setLocalCurrentWord('');
  }, []);

  const getDisplayText = useCallback(() => {
    return localSentence || state.sentence;
  }, [localSentence, state.sentence]);

  return {
    // Server state
    ...state,
    // Local state for immediate feedback
    localSentence: getDisplayText(),
    localWords,
    localCurrentWord,
    localCanUndo,
    localCanRedo,
    // Actions
    addLetter: addLetterLocal,
    addSpace: addSpaceLocal,
    undo: undoLocal,
    redo: () => {},
    clear: clearLocal,
    export: exportSentence,
  };
}