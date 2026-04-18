import { useRef, useState, useCallback } from 'react';

interface HistoryState<T> {
  past: T[];
  current: T;
  future: T[];
}

export function useHistory<T>(initial: T) {
  const state = useRef<HistoryState<T>>({ past: [], current: initial, future: [] });
  const [, rerender] = useState(0);

  const push = useCallback((next: T) => {
    const s = state.current;
    state.current = { past: [...s.past, s.current], current: next, future: [] };
    rerender((n) => n + 1);
  }, []);

  const undo = useCallback((): T | null => {
    const s = state.current;
    if (s.past.length === 0) return null;
    const target = s.past[s.past.length - 1];
    state.current = { past: s.past.slice(0, -1), current: target, future: [s.current, ...s.future] };
    rerender((n) => n + 1);
    return target;
  }, []);

  const redo = useCallback((): T | null => {
    const s = state.current;
    if (s.future.length === 0) return null;
    const target = s.future[0];
    state.current = { past: [...s.past, s.current], current: target, future: s.future.slice(1) };
    rerender((n) => n + 1);
    return target;
  }, []);

  const { current, past, future } = state.current;
  return {
    current,
    push,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
