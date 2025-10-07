export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  resumeText?: string;
  score: number;
  status: 'collecting-info' | 'in-progress' | 'paused' | 'completed';
  chatHistory: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  currentQuestion?: number;
  totalQuestions: number;
  timeRemaining?: number;
  aiSummary?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface InterviewState {
  candidates: Candidate[];
  currentCandidateId: string | null;
}
