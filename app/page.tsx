'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { collection, query, getDocs, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, PropQuestion, UserSubmission, LeaderboardEntry } from '@/lib/types';
import { autoLockEventIfNeeded } from '@/lib/eventLock';

export const dynamic = 'force-dynamic';

// Helper function to check if text answers match (flexible matching for text questions)
function isTextAnswerCorrect(correctAnswer: string, userAnswer: string): boolean {
  if (!correctAnswer || !userAnswer) return false;
  
  // Normalize both answers: lowercase and trim
  const normalizedCorrect = correctAnswer.toLowerCase().trim();
  const normalizedUser = userAnswer.toLowerCase().trim();
  
  // Exact match (case-insensitive)
  if (normalizedCorrect === normalizedUser) return true;
  
  // Split into words and check if any word from correct answer appears in user answer
  const correctWords = normalizedCorrect.split(/\s+/).filter(word => word.length > 0);
  const userWords = normalizedUser.split(/\s+/).filter(word => word.length > 0);
  
  // Check if all words from correct answer are present in user answer
  if (correctWords.every(word => normalizedUser.includes(word))) return true;
  
  // Check if all words from user answer are present in correct answer
  if (userWords.every(word => normalizedCorrect.includes(word))) return true;
  
  return false;
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [questions, setQuestions] = useState<PropQuestion[]>([]);
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch all events (no user required to view)
    const fetchEvents = async () => {
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        eventDate: doc.data().eventDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Event[];
      
      // Auto-lock events that have passed
      eventsData.forEach(async (event) => {
        if (event.eventDate && event.id) {
          await autoLockEventIfNeeded(event.id, event.eventDate, event.isLocked);
        }
      });
      
      setEvents(eventsData.sort((a, b) => {
        const dateA = a.eventDate instanceof Date ? a.eventDate.getTime() : 0;
        const dateB = b.eventDate instanceof Date ? b.eventDate.getTime() : 0;
        return dateB - dateA;
      }));
      
      // Auto-select the most recent event
      if (eventsData.length > 0) {
        setSelectedEventId(eventsData[0].id);
      }
    };

    fetchEvents();
    
    // Check every minute to auto-lock events
    const interval = setInterval(() => {
      fetchEvents();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;

    setLoadingLeaderboard(true);

    // Helper function to calculate leaderboard
    const calculateLeaderboard = (questionsData: PropQuestion[], submissionsData: UserSubmission[]) => {
      // Calculate scores - show all submissions even if no correct answers marked yet
      const leaderboardData: LeaderboardEntry[] = submissionsData.map((submission, index) => {
        let correctAnswers = 0;
        
        if (submission.picks && Array.isArray(submission.picks)) {
          submission.picks.forEach(pick => {
            const question = questionsData.find(q => q.id === pick.propId);
            if (question?.correctAnswer) {
              // For text questions, use flexible matching; for others, use exact match
              if (question.type === 'text') {
                if (isTextAnswerCorrect(question.correctAnswer, pick.answer)) {
                  correctAnswers++;
                }
              } else if (question.correctAnswer === pick.answer) {
                correctAnswers++;
              }
            }
          });
        }

        const totalQuestions = questionsData.length;
        const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

        return {
          submissionId: submission.id,
          entryNumber: index + 1,
          username: submission.username || '',
          firstName: submission.firstName,
          lastName: submission.lastName,
          correctAnswers,
          totalQuestions,
          percentage,
        };
      });

      // Sort by correct answers (descending), then by submission time (earlier = better rank)
      leaderboardData.sort((a, b) => {
        if (b.correctAnswers !== a.correctAnswers) {
          return b.correctAnswers - a.correctAnswers;
        }
        // If tied, earlier submission ranks higher
        const submissionA = submissionsData.find(s => s.id === a.submissionId);
        const submissionB = submissionsData.find(s => s.id === b.submissionId);
        const timeA = submissionA?.submittedAt instanceof Date ? submissionA.submittedAt.getTime() : 0;
        const timeB = submissionB?.submittedAt instanceof Date ? submissionB.submittedAt.getTime() : 0;
        return timeA - timeB;
      });
      
      // Reassign entry numbers after sorting
      leaderboardData.forEach((entry, index) => {
        entry.entryNumber = index + 1;
      });
      
      setLeaderboard(leaderboardData);
      setLoadingLeaderboard(false);
    };

    let currentQuestions: PropQuestion[] = [];
    let currentSubmissions: UserSubmission[] = [];
    let questionsLoaded = false;
    let submissionsLoaded = false;

    // Helper to recalculate when both are loaded
    const tryCalculate = () => {
      if (questionsLoaded && submissionsLoaded) {
        calculateLeaderboard(currentQuestions, currentSubmissions);
      }
    };

    // Subscribe to questions for the event (real-time)
    const questionsQuery = query(
      collection(db, 'questions'),
      where('eventId', '==', selectedEventId)
    );
    
    const unsubscribeQuestions = onSnapshot(questionsQuery, (questionsSnapshot) => {
      currentQuestions = questionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PropQuestion[];
      // Sort questions by order
      currentQuestions.sort((a, b) => (a.order || 0) - (b.order || 0));
      setQuestions(currentQuestions);
      questionsLoaded = true;
      tryCalculate();
    }, (error) => {
      console.error('Error loading questions:', error);
      setLoadingLeaderboard(false);
    });

    // Subscribe to submissions for the event (real-time)
    const submissionsQuery = query(
      collection(db, 'submissions'),
      where('eventId', '==', selectedEventId)
    );
    
    const unsubscribeSubmissions = onSnapshot(submissionsQuery, (submissionsSnapshot) => {
      currentSubmissions = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate(),
      })) as UserSubmission[];
      setSubmissions(currentSubmissions);
      submissionsLoaded = true;
      tryCalculate();
    }, (error) => {
      console.error('Error loading submissions:', error);
      setLoadingLeaderboard(false);
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeQuestions();
      unsubscribeSubmissions();
    };
  }, [selectedEventId]);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="flex-1" style={{ border: 'none', borderBottom: 'none', background: 'transparent' }}>
      <Navbar />
      
      <main className="container mx-auto px-4 py-4">
        <div className="mb-4 max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">
            George's Famous Annual Super Bowl Prop Bet Sheet
          </h1>
          <Link
            href="/events"
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-semibold whitespace-nowrap"
          >
            + Create Entry
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Events Yet</h2>
            <p className="text-gray-600">
              Leaderboards will appear here once events are created.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label htmlFor="event-select" className="block text-sm font-medium text-gray-700 mb-1">
                Select Event
              </label>
              <select
                id="event-select"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full sm:max-w-md px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 text-base min-h-[44px]"
              >
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name?.replace(/Super Bowl 2026/gi, 'Super Bowl LX')} - {event.eventDate instanceof Date ? event.eventDate.toLocaleDateString() : 'Invalid Date'}
                  </option>
                ))}
              </select>
            </div>

            {loadingLeaderboard ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-600">Loading leaderboard...</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-600">No submissions yet for this event.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div 
                  className="px-4 py-1.5"
                  style={{
                    background: 'linear-gradient(to right, #0B162A 0%, #0B162A 75%, #C83803 100%)'
                  }}
                >
                  <h2 className="text-lg font-bold text-white">
                    {selectedEvent?.name?.replace(/Super Bowl 2026/gi, 'Super Bowl LX')}
                  </h2>
                  <p className="text-white opacity-90 text-xs">
                    {leaderboard.length} participant{leaderboard.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Mobile Card View */}
                <div className="block md:hidden divide-y divide-gray-200">
                  {leaderboard.map((entry, index) => {
                    const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                    const userSubmission = submissions.find(s => s.id === entry.submissionId);
                    const isExpanded = expandedSubmissionId === entry.submissionId;
                    const displayUsername = entry.username || userSubmission?.username;
                    
                    return (
                      <div key={entry.submissionId} className="p-2">
                        <div 
                          className="cursor-pointer"
                          onClick={() => setExpandedSubmissionId(isExpanded ? null : entry.submissionId)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className="text-base">{rankEmoji}</span>
                              <span className="text-sm font-bold text-gray-900">#{index + 1}</span>
                              <span className="text-xs font-bold text-gray-900 truncate">{entry.username || `Entry ${entry.entryNumber}`}</span>
                              {entry.firstName && entry.lastName && (
                                <span className="text-xs text-gray-600 truncate">• {entry.firstName} {entry.lastName}</span>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedSubmissionId(isExpanded ? null : entry.submissionId);
                              }}
                              className="text-blue-600 text-base min-w-[36px] min-h-[36px] flex items-center justify-center gap-1 flex-shrink-0"
                            >
                              <span className="text-xs">Picks</span>
                              <span>{isExpanded ? '▼' : '▶'}</span>
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="text-xs text-gray-500 flex-shrink-0">
                              {userSubmission?.submittedAt instanceof Date 
                                ? userSubmission.submittedAt.toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })
                                : 'Unknown'}
                            </div>
                            <div className="text-xs font-semibold text-gray-900 flex-shrink-0">
                              {entry.correctAnswers}/{entry.totalQuestions}
                            </div>
                            <div className="text-xs font-bold text-blue-600 flex-shrink-0">
                              {entry.percentage.toFixed(1)}%
                            </div>
                          </div>
                          <div className="w-full bg-blue-100 rounded-full h-1.5">
                            <div
                              style={{ width: `${entry.percentage}%` }}
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                            />
                          </div>
                        </div>
                        {isExpanded && userSubmission && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {questions.map((question, qIndex) => {
                                const pick = userSubmission.picks?.find(p => p.propId === question.id);
                                const userAnswer = pick?.answer || 'Not answered';
                                // For text questions, use flexible matching; for others, use exact match
                                const isCorrect = question.correctAnswer && (
                                  question.type === 'text' 
                                    ? isTextAnswerCorrect(question.correctAnswer, userAnswer)
                                    : question.correctAnswer === userAnswer
                                );
                                const hasCorrectAnswer = !!question.correctAnswer;
                                
                                let displayAnswer = userAnswer;
                                if (question.type === 'multiple_choice' && question.options) {
                                  const selectedOption = question.options.find(opt => opt.id === userAnswer);
                                  displayAnswer = selectedOption?.text || userAnswer;
                                } else if (question.type === 'yes_no' && question.yesNoLabels) {
                                  displayAnswer = userAnswer === 'yes' ? question.yesNoLabels.yes : question.yesNoLabels.no;
                                } else if (question.type === 'over_under') {
                                  displayAnswer = userAnswer === 'over' ? `Over ${question.overUnderLine}` : `Under ${question.overUnderLine}`;
                                }
                                
                                return (
                                  <div key={question.id} className="text-xs">
                                    <div className="font-semibold text-gray-800 mb-1">
                                      #{qIndex + 1}: {question.question}
                                    </div>
                                    <div className={`px-2 py-1 rounded ${
                                      hasCorrectAnswer 
                                        ? (isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {displayAnswer}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                          Rank
                        </th>
                        <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Submitted
                        </th>
                        <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Entry
                        </th>
                        <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Correct
                        </th>
                        <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-full">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {leaderboard.map((entry, index) => {
                        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                        const userSubmission = submissions.find(s => s.id === entry.submissionId);
                        const isExpanded = expandedSubmissionId === entry.submissionId;
                        const displayUsername = entry.username || userSubmission?.username;
                        
                        return (
                          <>
                            <tr 
                              key={entry.submissionId} 
                              className="hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => setExpandedSubmissionId(isExpanded ? null : entry.submissionId)}
                            >
                              <td className="px-3 py-1 whitespace-nowrap text-right w-16">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-sm w-5 text-center">{rankEmoji}</span>
                                  <span className="text-sm font-semibold text-gray-900 w-6 text-right">
                                    {index + 1}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-1 whitespace-nowrap">
                                <div className="text-xs text-gray-600">
                                  {userSubmission?.submittedAt instanceof Date 
                                    ? userSubmission.submittedAt.toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      })
                                    : 'Unknown'}
                                </div>
                              </td>
                              <td className="px-3 py-1 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="text-xs font-bold text-gray-900">
                                    {entry.username || `Entry ${entry.entryNumber}`}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedSubmissionId(isExpanded ? null : entry.submissionId);
                                    }}
                                    className="ml-auto text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                                  >
                                    <span>Picks</span>
                                    <span>{isExpanded ? '▼' : '▶'}</span>
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-1 whitespace-nowrap">
                                <div className="text-xs text-gray-900">
                                  {entry.firstName && entry.lastName 
                                    ? `${entry.firstName} ${entry.lastName}`
                                    : '-'}
                                </div>
                              </td>
                              <td className="px-3 py-1 whitespace-nowrap">
                                <div className="text-xs text-gray-900">
                                  <span className="font-semibold">{entry.correctAnswers}</span>
                                  <span className="text-gray-500">/{entry.totalQuestions}</span>
                                </div>
                              </td>
                              <td className="px-3 py-1 w-full">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">
                                    {entry.percentage.toFixed(1)}%
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="overflow-hidden h-1.5 text-xs flex rounded bg-blue-100">
                                      <div
                                        style={{ width: `${entry.percentage}%` }}
                                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && userSubmission && (
                              <tr>
                                <td colSpan={6} className="px-3 py-1.5 bg-gray-50">
                                  <div className="bg-white rounded-lg shadow-lg p-2 border-2 border-blue-500">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <h3 className="font-bold text-sm text-gray-800">
                                        {displayUsername ? `${displayUsername}` : `Entry ${entry.entryNumber}`} Answers
                                      </h3>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedSubmissionId(null);
                                        }}
                                        className="text-gray-500 hover:text-gray-700 text-xs"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    <div className="space-y-1.5 max-h-96 overflow-y-auto">
                                      {questions.map((question, qIndex) => {
                                        const pick = userSubmission.picks?.find(p => p.propId === question.id);
                                        const userAnswer = pick?.answer || 'Not answered';
                                        // For text questions, use flexible matching; for others, use exact match
                                        const isCorrect = question.correctAnswer && (
                                          question.type === 'text' 
                                            ? isTextAnswerCorrect(question.correctAnswer, userAnswer)
                                            : question.correctAnswer === userAnswer
                                        );
                                        const hasCorrectAnswer = !!question.correctAnswer;
                                        
                                        // Format the answer display
                                        let displayAnswer = userAnswer;
                                        if (question.type === 'multiple_choice' && question.options) {
                                          const selectedOption = question.options.find(opt => opt.id === userAnswer);
                                          displayAnswer = selectedOption?.text || userAnswer;
                                        } else if (question.type === 'yes_no' && question.yesNoLabels) {
                                          displayAnswer = userAnswer === 'yes' ? question.yesNoLabels.yes : question.yesNoLabels.no;
                                        } else if (question.type === 'over_under') {
                                          displayAnswer = userAnswer === 'over' ? `Over ${question.overUnderLine}` : `Under ${question.overUnderLine}`;
                                        }
                                        
                                        return (
                                          <div key={question.id} className="border-b border-gray-200 pb-1 last:border-0">
                                            <div className="flex items-start gap-2">
                                              <span className="text-xs font-semibold text-gray-500 min-w-[25px]">
                                                {qIndex + 1}.
                                              </span>
                                              <div className="flex-1">
                                                <p className="text-xs font-medium text-gray-800 mb-0.5">
                                                  {question.question}
                                                </p>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                    hasCorrectAnswer 
                                                      ? (isCorrect 
                                                          ? 'bg-green-100 text-green-800' 
                                                          : 'bg-red-100 text-red-800')
                                                      : 'bg-gray-100 text-gray-600'
                                                  }`}>
                                                    {displayAnswer}
                                                  </span>
                                                  {hasCorrectAnswer && (
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                      isCorrect 
                                                        ? 'bg-green-500 text-white' 
                                                        : 'bg-gray-400 text-white'
                                                    }`}>
                                                      {isCorrect ? '✓' : '✗'}
                                                    </span>
                                                  )}
                                                  {hasCorrectAnswer && !isCorrect && question.correctAnswer && (
                                                    <span className="text-xs text-gray-500">
                                                      (Correct: {(() => {
                                                        if (question.type === 'multiple_choice' && question.options) {
                                                          const correctOption = question.options.find(opt => opt.id === question.correctAnswer);
                                                          return correctOption?.text || question.correctAnswer;
                                                        } else if (question.type === 'yes_no' && question.yesNoLabels) {
                                                          return question.correctAnswer === 'yes' ? question.yesNoLabels.yes : question.yesNoLabels.no;
                                                        } else if (question.type === 'over_under') {
                                                          return question.correctAnswer === 'over' ? `Over ${question.overUnderLine}` : `Under ${question.overUnderLine}`;
                                                        }
                                                        return question.correctAnswer;
                                                      })()})
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="pb-4 px-4 text-center w-full border-0" style={{ border: 'none', marginTop: 'auto', paddingTop: '0' }}>
        <p className="text-xs text-gray-500">
          Copyright © 2026 210PS Productions, LLC
          <br />
          For entertainment/marketing purposes only.
        </p>
      </footer>
    </div>
  );
}
