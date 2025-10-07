import { InterviewState, Candidate } from '@/types/interview';

const STORAGE_KEY = 'interview_assistant_state';

export const loadState = (): InterviewState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading state:', error);
  }
  return {
    candidates: [],
    currentCandidateId: null,
  };
};

export const saveState = (state: InterviewState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving state:', error);
  }
};

export const updateCandidate = (candidateId: string, updates: Partial<Candidate>): void => {
  const state = loadState();
  const candidateIndex = state.candidates.findIndex(c => c.id === candidateId);
  
  if (candidateIndex !== -1) {
    state.candidates[candidateIndex] = {
      ...state.candidates[candidateIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveState(state);
  }
};

export const addCandidate = (candidate: Candidate): void => {
  const state = loadState();
  state.candidates.push(candidate);
  state.currentCandidateId = candidate.id;
  saveState(state);
};

export const getCurrentCandidate = (): Candidate | null => {
  const state = loadState();
  if (!state.currentCandidateId) return null;
  return state.candidates.find(c => c.id === state.currentCandidateId) || null;
};
