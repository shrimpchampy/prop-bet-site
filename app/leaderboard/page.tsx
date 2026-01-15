'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, PropQuestion, UserSubmission, LeaderboardEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Helper function to check if text answers match (flexible matching + accepted aliases)
function isTextAnswerCorrect(correctAnswer: string, userAnswer: string, acceptedAnswers: string[] = []): boolean {
  if (!userAnswer) return false;
  const candidates = [correctAnswer, ...acceptedAnswers].filter(Boolean);
  if (candidates.length === 0) return false;
  return candidates.some(candidate => basicTextMatch(candidate, userAnswer));
}

function basicTextMatch(expected: string, actual: string): boolean {
  if (!expected || !actual) return false;
  
  // Normalize both answers: lowercase and trim
  const normalizedExpected = expected.toLowerCase().trim();
  const normalizedActual = actual.toLowerCase().trim();
  
  // Exact match (case-insensitive)
  if (normalizedExpected === normalizedActual) return true;
  
  // Split into words and check if any word from expected answer appears in actual answer
  const expectedWords = normalizedExpected.split(/\s+/).filter(word => word.length > 0);
  const actualWords = normalizedActual.split(/\s+/).filter(word => word.length > 0);
  
  // Check if all words from expected answer are present in actual answer
  if (expectedWords.every(word => normalizedActual.includes(word))) return true;
  
  // Check if all words from actual answer are present in expected answer
  if (actualWords.every(word => normalizedExpected.includes(word))) return true;
  
  return false;
}

type TabType = 'leaderboard' | 'distribution';

interface QuestionStats {
  questionId: string;
  question: string;
  correctAnswer: string;
  totalCorrect: number;
  totalSubmissions: number;
  percentage: number;
  order: number;
}

export default function LeaderboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [questions, setQuestions] = useState<PropQuestion[]>([]);
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard');
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);

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
          ...doc.data(),
          submittedAt: doc.data().submittedAt?.toDate ? doc.data().submittedAt.toDate() : doc.data().submittedAt
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
                  if (isTextAnswerCorrect(question.correctAnswer, pick.answer, question.acceptedAnswers || [])) {
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
        
        console.log('Leaderboard data:', leaderboardData);
        setLeaderboard(leaderboardData);

        // Calculate question statistics
        const stats: QuestionStats[] = questionsData.map((question, index) => {
          let correctCount = 0;
          const totalSubs = submissionsData.length;

          if (question.correctAnswer) {
            const correctAnswer = question.correctAnswer;
            submissionsData.forEach(submission => {
              if (submission.picks && Array.isArray(submission.picks)) {
                const pick = submission.picks.find(p => p.propId === question.id);
                if (pick) {
                  if (question.type === 'text') {
                    if (isTextAnswerCorrect(correctAnswer, pick.answer, question.acceptedAnswers || [])) {
                      correctCount++;
                    }
                  } else if (correctAnswer === pick.answer) {
                    correctCount++;
                  }
                }
              }
            });
          }

          const percentage = totalSubs > 0 ? (correctCount / totalSubs) * 100 : 0;

          // Format correct answer for display
          let formattedAnswer = question.correctAnswer || 'Not set';
          if (question.type === 'multiple_choice' && question.options) {
            const correctOption = question.options.find(opt => opt.id === question.correctAnswer);
            formattedAnswer = correctOption?.text || question.correctAnswer || 'Not set';
          } else if (question.type === 'yes_no' && question.yesNoLabels) {
            formattedAnswer = question.correctAnswer === 'yes' ? question.yesNoLabels.yes : question.yesNoLabels.no;
          } else if (question.type === 'over_under') {
            formattedAnswer = question.correctAnswer === 'over' ? `Over ${question.overUnderLine}` : `Under ${question.overUnderLine}`;
          }

          return {
            questionId: question.id,
            question: question.question,
            correctAnswer: formattedAnswer,
            totalCorrect: correctCount,
            totalSubmissions: totalSubs,
            percentage,
            order: index + 1, // Use 1-based index from sorted array as question number
          };
        });

        // Sort by total correct (descending), then by percentage
        stats.sort((a, b) => {
          if (b.totalCorrect !== a.totalCorrect) {
            return b.totalCorrect - a.totalCorrect;
          }
          return b.percentage - a.percentage;
        });

        setQuestionStats(stats);
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
    <div className="flex-1" style={{ border: 'none', borderBottom: 'none', background: 'transparent' }}>
      <Navbar />
      
      <main className="container mx-auto px-4 py-4">
        <div className="mb-4 max-w-7xl mx-auto flex items-center justify-between" key="header-container">
          <h1 className="text-3xl font-bold text-gray-800">
            George's Famous Annual Super Bowl Prop Bet Sheet
          </h1>
          <a
            href="/events"
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-semibold whitespace-nowrap"
          >
            + Create Entry
          </a>
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
            {loadingLeaderboard ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-600">Loading leaderboard...</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-600">No submissions yet for this event.</p>
              </div>
            ) : (
              <>
                <div className="max-w-7xl mx-auto mb-2 flex justify-end">
                  <div>
                    <label htmlFor="event-select" className="block text-xs font-medium text-gray-700 mb-1">
                      Select Event
                    </label>
                    <select
                      id="event-select"
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                    >
                      {events.map(event => (
                        <option key={event.id} value={event.id}>
                          {event.name} - {event.eventDate.toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-7xl mx-auto">
                <div 
                  className="px-3 py-1.5"
                  style={{
                    background: 'linear-gradient(to right, #0B162A 0%, #0B162A 75%, #C83803 100%)'
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        {selectedEvent?.name}
                      </h2>
                      <p className="text-white opacity-90 text-xs">
                        {leaderboard.length} participant{leaderboard.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          activeTab === 'leaderboard'
                            ? 'bg-white text-gray-900'
                            : 'text-white hover:bg-white/20'
                        }`}
                      >
                        Leaderboard
                      </button>
                      <button
                        onClick={() => setActiveTab('distribution')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          activeTab === 'distribution'
                            ? 'bg-white text-gray-900'
                            : 'text-white hover:bg-white/20'
                        }`}
                      >
                        Correct Picks
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {activeTab === 'leaderboard' ? (
                    <table className="w-full" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '64px' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '80px' }} />
                        <col />
                      </colgroup>
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
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
                                  {userSubmission?.submittedAt ? (
                                    (() => {
                                      let date: Date;
                                      const submittedAt = userSubmission.submittedAt;
                                      if (submittedAt instanceof Date) {
                                        date = submittedAt;
                                      } else if (submittedAt && typeof submittedAt === 'object' && 'toDate' in submittedAt && typeof (submittedAt as any).toDate === 'function') {
                                        date = (submittedAt as any).toDate();
                                      } else {
                                        date = new Date(submittedAt as any);
                                      }
                                      return date.toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      });
                                    })()
                                  ) : 'Unknown'}
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
                              <td className="px-3 py-1">
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
                                        {entry.username ? `${entry.username}` : `Entry ${entry.entryNumber}`} Answers
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
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                    {questions.map((question, qIndex) => {
                                      const pick = userSubmission.picks?.find(p => p.propId === question.id);
                                      const userAnswer = pick?.answer || 'Not answered';
                                      // For text questions, use flexible matching; for others, use exact match
                                      const isCorrect = question.correctAnswer && (
                                        question.type === 'text' 
                                          ? isTextAnswerCorrect(question.correctAnswer, userAnswer, question.acceptedAnswers || [])
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
                                        <div key={question.id} className="text-xs">
                                          <div className="font-semibold text-gray-800 mb-1">
                                            #{qIndex + 1}: {question.question}
                                          </div>
                                          <div className={`px-2 py-1 rounded group flex items-center gap-2 ${
                                            hasCorrectAnswer 
                                              ? (isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                                              : 'bg-gray-100 text-gray-600'
                                          }`}>
                                            <span className="min-w-0">{displayAnswer}</span>
                                            {isCorrect && (
                                              <img
                                                src="/gzhyped.gif"
                                                alt="Correct pick"
                                                className="pointer-events-none h-6 w-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                                              />
                                            )}
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
                  ) : activeTab === 'distribution' ? (
                    questionStats.length === 0 ? (
                      <div className="p-12 text-center">
                        <p className="text-gray-600">No questions with correct answers set yet.</p>
                      </div>
                    ) : (
                      <table className="w-full" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '64px' }} />
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '100px' }} />
                        <col />
                      </colgroup>
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            #
                          </th>
                          <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Question
                          </th>
                          <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Correct Answer
                          </th>
                          <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Total Correct
                          </th>
                          <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Percentage
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {questionStats.map((stat, index) => {
                          return (
                            <tr key={stat.questionId} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-1 whitespace-nowrap text-right w-16">
                                <span className="text-sm font-semibold text-gray-900">
                                  {stat.order || index + 1}
                                </span>
                              </td>
                              <td className="px-3 py-1">
                                <span className="text-xs font-medium text-gray-900">
                                  {stat.question}
                                </span>
                              </td>
                              <td className="px-3 py-1">
                                <span className="text-xs text-gray-900 break-words">
                                  {stat.correctAnswer}
                                </span>
                              </td>
                              <td className="px-3 py-1 whitespace-nowrap">
                                <div className="text-xs text-gray-900">
                                  <span className="font-semibold">{stat.totalCorrect}</span>
                                  <span className="text-gray-500">/{stat.totalSubmissions}</span>
                                </div>
                              </td>
                              <td className="px-3 py-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">
                                    {stat.percentage.toFixed(1)}%
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="overflow-hidden h-1.5 text-xs flex rounded bg-blue-100">
                                      <div
                                        style={{ width: `${stat.percentage}%` }}
                                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    )
                  ) : null}
                </div>
              </div>
              </>
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

