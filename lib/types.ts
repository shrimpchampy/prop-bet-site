// No user types needed - fully anonymous

// Prop question types
export type PropType = 'multiple_choice' | 'over_under' | 'yes_no' | 'text';

export interface PropOption {
  id: string;
  text: string;
}

export interface PropQuestion {
  id: string;
  eventId: string;
  question: string;
  type: PropType;
  options?: PropOption[]; // For multiple choice
  overUnderLine?: number; // For over/under
  yesNoLabels?: { yes: string; no: string }; // Custom labels for yes/no questions (e.g., "Heads"/"Tails")
  correctAnswer?: string; // Set by admin when marking correct
  order: number;
  createdAt: Date;
}

// Event types
export interface Event {
  id: string;
  name: string;
  description: string;
  eventDate: Date;
  isActive: boolean;
  isLocked: boolean; // Lock submissions after deadline
  createdAt: Date;
  createdBy: string;
}

// User submission types
export interface UserPick {
  propId: string;
  answer: string; // Could be option ID, 'over'/'under', 'yes'/'no', or text
}

export interface UserSubmission {
  id: string;
  eventId: string;
  username: string; // Required username
  firstName: string; // Required first name
  lastName: string; // Required last name
  picks: UserPick[];
  submittedAt: Date;
}

// Leaderboard types
export interface LeaderboardEntry {
  submissionId: string;
  entryNumber: number; // Entry #1, Entry #2, etc.
  username: string; // Username
  firstName?: string; // First name
  lastName?: string; // Last name
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
}





