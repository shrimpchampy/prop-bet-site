'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, PropQuestion, UserSubmission, LeaderboardEntry } from '@/lib/types';

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

export default function LeaderboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [questions, setQuestions] = useState<PropQuestion[]>([]);
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  useEffect(() => {

    // Fetch all events
    const fetchEvents = async () => {
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        eventDate: doc.data().eventDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Event[];
      
      setEvents(eventsData.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime()));
      
      // Auto-select the most recent event
      if (eventsData.length > 0) {
        setSelectedEventId(eventsData[0].id);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;

    const calculateLeaderboard = async () => {
      setLoadingLeaderboard(true);
      try {
        // Fetch questions for the event
        const questionsQuery = query(
          collection(db, 'questions'),
          where('eventId', '==', selectedEventId)
        );
        const questionsSnapshot = await getDocs(questionsQuery);
        const questionsData = questionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PropQuestion[];
        // Sort questions by order
        questionsData.sort((a, b) => (a.order || 0) - (b.order || 0));
        setQuestions(questionsData);

        // Fetch all submissions for the event
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('eventId', '==', selectedEventId)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const submissionsData = submissionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserSubmission[];
        setSubmissions(submissionsData);

        console.log('Submissions found:', submissionsData.length, submissionsData);
        console.log('Questions found:', questionsData.length, questionsData);
        console.log('Selected event ID:', selectedEventId);

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
            username: submission.username,
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
        
        console.log('Leaderboard data:', leaderboardData);
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error('Error calculating leaderboard:', err);
        alert('Error loading leaderboard. Check console for details.');
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    calculateLeaderboard();
  }, [selectedEventId]);

  // Allow viewing without user

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="flex-1 bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Leaderboard 🏆
          </h1>
          <p className="text-gray-600">
            See how you stack up against your friends
          </p>
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
            <div className="mb-6">
              <label htmlFor="event-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Event
              </label>
              <select
                id="event-select"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} - {event.eventDate.toLocaleDateString()}
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
                  className="px-4 py-2"
                  style={{
                    background: 'linear-gradient(to right, #0B162A 0%, #0B162A 75%, #C83803 100%)'
                  }}
                >
                  <h2 className="text-xl font-bold text-white">
                    {selectedEvent?.name}
                  </h2>
                  <p className="text-white opacity-90 text-xs">
                    {leaderboard.length} participant{leaderboard.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Entry
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Correct
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Percentage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {leaderboard.map((entry, index) => {
                        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                        const userSubmission = submissions.find(s => s.id === entry.submissionId);
                        const isExpanded = expandedSubmissionId === entry.submissionId;
                        
                        return (
                          <>
                            <tr 
                              key={entry.submissionId} 
                              className="hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => setExpandedSubmissionId(isExpanded ? null : entry.submissionId)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{rankEmoji}</span>
                                  <span className="text-lg font-semibold text-gray-900">
                                    #{index + 1}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {entry.username || `Entry #${entry.entryNumber}`}
                                    </div>
                                    {entry.username && (
                                      <div className="text-xs text-gray-500">Entry #{entry.entryNumber}</div>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedSubmissionId(isExpanded ? null : entry.submissionId);
                                    }}
                                    className="ml-auto text-blue-600 hover:text-blue-800 text-sm font-medium"
                                  >
                                    {isExpanded ? '▼ Hide Answers' : '▶ Show Answers'}
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  <span className="font-semibold text-lg">{entry.correctAnswers}</span>
                                  <span className="text-gray-500"> / {entry.totalQuestions}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-1 max-w-xs">
                                    <div className="relative pt-1">
                                      <div className="flex mb-2 items-center justify-between">
                                        <div>
                                          <span className="text-xs font-semibold inline-block text-blue-600">
                                            {entry.percentage.toFixed(1)}%
                                          </span>
                                        </div>
                                      </div>
                                      <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-100">
                                        <div
                                          style={{ width: `${entry.percentage}%` }}
                                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && userSubmission && (
                              <tr>
                                <td colSpan={4} className="px-6 py-4 bg-gray-50">
                                  <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-blue-500">
                                    <div className="flex items-center justify-between mb-3">
                                      <h3 className="font-bold text-lg text-gray-800">
                                        {entry.username ? `${entry.username} (Entry #${entry.entryNumber})` : `Entry #${entry.entryNumber}`} Answers
                                      </h3>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedSubmissionId(null);
                                        }}
                                        className="text-gray-500 hover:text-gray-700 text-sm"
                                      >
                                        ✕ Close
                                      </button>
                                    </div>
                                  <div className="space-y-3 max-h-96 overflow-y-auto">
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
                                        <div key={question.id} className="border-b border-gray-200 pb-3 last:border-0">
                                          <div className="flex items-start gap-3">
                                            <span className="text-sm font-semibold text-gray-500 min-w-[30px]">
                                              #{qIndex + 1}
                                            </span>
                                            <div className="flex-1">
                                              <p className="text-sm font-medium text-gray-800 mb-1">
                                                {question.question}
                                              </p>
                                              <div className="flex items-center gap-2">
                                                <span className={`text-sm px-2 py-1 rounded ${
                                                  hasCorrectAnswer 
                                                    ? (isCorrect 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800')
                                                    : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                  {displayAnswer}
                                                </span>
                                                {hasCorrectAnswer && (
                                                  <span className={`text-xs px-2 py-1 rounded ${
                                                    isCorrect 
                                                      ? 'bg-green-500 text-white' 
                                                      : 'bg-gray-400 text-white'
                                                  }`}>
                                                    {isCorrect ? '✓ Correct' : '✗ Wrong'}
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
    </div>
  );
}

