'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, setDoc, getDocs, addDoc } from 'firebase/firestore';
import { db, serverTimestamp } from '@/lib/firebase';
import { Event, PropQuestion, UserPick } from '@/lib/types';
import { autoLockEventIfNeeded } from '@/lib/eventLock';

export const dynamic = 'force-dynamic';

export default function SubmitPicksPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [questions, setQuestions] = useState<PropQuestion[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState<number | null>(null);

  useEffect(() => {
    if (!eventId) return;

    // Load last submission time from localStorage for rate limiting
    if (typeof window !== 'undefined') {
      const lastSubmission = localStorage.getItem(`lastSubmission_${eventId}`);
      if (lastSubmission) {
        const lastTime = parseInt(lastSubmission, 10);
        // Only use if less than 5 minutes old (rate limit window)
        if (Date.now() - lastTime < 300000) {
          setLastSubmissionTime(lastTime);
        }
      }
    }

    // Fetch event details
    const fetchEvent = async () => {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        const eventData = {
          id: eventDoc.id,
          ...eventDoc.data(),
          eventDate: eventDoc.data().eventDate?.toDate(),
          createdAt: eventDoc.data().createdAt?.toDate(),
        } as Event;
        
        // Auto-lock if event time has passed
        if (eventData.eventDate && eventData.id) {
          await autoLockEventIfNeeded(eventData.id, eventData.eventDate, eventData.isLocked);
          // Re-fetch to get updated lock status
          const updatedDoc = await getDoc(doc(db, 'events', eventId));
          if (updatedDoc.exists()) {
            setEvent({
              id: updatedDoc.id,
              ...updatedDoc.data(),
              eventDate: updatedDoc.data().eventDate?.toDate(),
              createdAt: updatedDoc.data().createdAt?.toDate(),
            } as Event);
            return;
          }
        }
        
        setEvent(eventData);
      }
    };

    fetchEvent();
    
    // Subscribe to questions
    const questionsQuery = query(
      collection(db, 'questions'),
      where('eventId', '==', eventId),
      orderBy('order', 'asc')
    );
    
    const unsubscribeQuestions = onSnapshot(questionsQuery, (snapshot) => {
      const questionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as PropQuestion[];
      // Sort client-side by order in case orderBy doesn't work
      questionsData.sort((a, b) => (a.order || 0) - (b.order || 0));
      setQuestions(questionsData);
    }, (error) => {
      console.error('Error loading questions:', error);
      // If orderBy fails, try without it and sort client-side
      const questionsQueryNoOrder = query(
        collection(db, 'questions'),
        where('eventId', '==', eventId)
      );
      const unsubscribeFallback = onSnapshot(questionsQueryNoOrder, (snapshot) => {
        const questionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        })) as PropQuestion[];
        questionsData.sort((a, b) => (a.order || 0) - (b.order || 0));
        setQuestions(questionsData);
      });
      return () => unsubscribeFallback();
    });
    
    // Check every minute to auto-lock if needed
    const interval = setInterval(() => {
      fetchEvent();
    }, 60000); // Check every minute
    
    return () => {
      clearInterval(interval);
      unsubscribeQuestions();
    };
  }, [eventId]);

  const handlePickChange = (questionId: string, answer: string) => {
    setPicks({ ...picks, [questionId]: answer });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!username.trim()) {
      alert('Please enter a username.');
      return;
    }
    
    if (!fullName.trim()) {
      alert('Please enter your first and last name.');
      return;
    }
    
    // Parse first and last name
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      alert('Please enter both your first and last name.');
      return;
    }
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' '); // Handle multiple last names
    
    // Validate all questions are answered
    const unanswered = questions.filter(q => !picks[q.id]);
    if (unanswered.length > 0) {
      alert(`Please answer all questions. ${unanswered.length} question(s) remaining.`);
      return;
    }

    // Rate limiting: Prevent submissions faster than 60 seconds apart
    const now = Date.now();
    if (lastSubmissionTime && (now - lastSubmissionTime) < 60000) {
      const secondsLeft = Math.ceil((60000 - (now - lastSubmissionTime)) / 1000);
      alert(`Please wait ${secondsLeft} second(s) before submitting again. This helps prevent spam.`);
      return;
    }

    setSubmitting(true);
    try {
      // Check for existing submissions with same username for this event
      const existingSubmissionsQuery = query(
        collection(db, 'submissions'),
        where('eventId', '==', eventId),
        where('username', '==', username.trim().toLowerCase())
      );
      const existingSnapshot = await getDocs(existingSubmissionsQuery);
      
      // Limit submissions per username per event (configurable: 5 max)
      const MAX_SUBMISSIONS_PER_USER = 5;
      if (existingSnapshot.size >= MAX_SUBMISSIONS_PER_USER) {
        alert(`You've already submitted ${existingSnapshot.size} entries for this event. Maximum allowed is ${MAX_SUBMISSIONS_PER_USER} entries per username to prevent spam.`);
        setSubmitting(false);
        return;
      }

      const picksArray: UserPick[] = Object.entries(picks).map(([propId, answer]) => ({
        propId,
        answer,
      }));

      // Create submission with required fields and security metadata
      const submissionData: any = {
        eventId,
        username: username.trim().toLowerCase(), // Normalize to lowercase
        firstName: firstName,
        lastName: lastName,
        picks: picksArray,
        submittedAt: serverTimestamp(),
        // Security metadata
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: now, // Client-side timestamp for rate limiting
      };
      
      await addDoc(collection(db, 'submissions'), submissionData);

      // Update last submission time
      setLastSubmissionTime(now);
      
      // Store in localStorage for client-side rate limiting across page refreshes
      if (typeof window !== 'undefined') {
        localStorage.setItem(`lastSubmission_${eventId}`, now.toString());
      }

      alert('Picks submitted successfully!');
      setHasSubmitted(true);
      router.push('/events');
    } catch (err: any) {
      console.error('Error submitting picks:', err);
      const errorMessage = err.message || 'Failed to submit picks';
      alert(`Error: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!event) {
    return (
      <div className="flex-1 bg-white" style={{ border: 'none', borderBottom: 'none' }}>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (event.isLocked && !hasSubmitted) {
    return (
      <div className="flex-1 bg-white" style={{ border: 'none', borderBottom: 'none' }}>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Event Locked</h2>
            <p className="text-gray-600 mb-6">
              This event is no longer accepting submissions.
            </p>
            <button
              onClick={() => router.push('/events')}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Events
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white" style={{ border: 'none', borderBottom: 'none' }}>
      <Navbar />
      
      <main className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-4xl">
        <div className="mb-3 sm:mb-4">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-1">
            {event.name?.replace(/Super Bowl 2026/gi, 'Super Bowl LX')}
          </h1>
          {event.description && event.description.replace(/prop bet pool/gi, '').trim() && (
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              {event.description.replace(/prop bet pool/gi, '').trim()}
            </p>
          )}
          <p className="text-xs text-gray-500">
            📅 {event.eventDate?.toLocaleDateString()} at {event.eventDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          {hasSubmitted && (
            <div className="mt-2 bg-green-100 border border-green-400 text-green-700 px-3 py-1.5 rounded text-sm">
              ✓ You've already submitted picks for this event. You can update them below.
            </div>
          )}
        </div>

        {questions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600">No questions available for this event yet.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b">
              <h2 className="text-sm font-semibold text-gray-800 mb-2">Your Information</h2>
              <div className="space-y-2">
                <div>
                  <label htmlFor="username" className="block text-xs font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-base min-h-[44px]"
                    placeholder="Enter your username"
                  />
                </div>
                <div>
                  <label htmlFor="fullName" className="block text-xs font-medium text-gray-700 mb-1">
                    First and Last Name *
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-base min-h-[44px]"
                    placeholder="Enter your first and last name"
                  />
                  <p className="mt-0.5 text-xs text-gray-500">
                    Enter both your first and last name in this field
                  </p>
                </div>
              </div>
            </div>
            <div className="divide-y">
              {questions.map((q, index) => (
                <div key={q.id} className="px-4 py-2.5">
                  <div className="flex flex-col md:flex-row md:items-start md:gap-4">
                    {/* Left side - Question */}
                    <div className="flex-1 mb-2 md:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                        {picks[q.id] && (
                          <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                            ✓
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800">
                        {q.question}
                      </h3>
                    </div>

                    {/* Right side - Answer choices */}
                    <div className="md:w-80 md:flex-shrink-0">
                    {q.type === 'multiple_choice' && q.options && (
                      <div className="space-y-1">
                        {q.options.map(option => (
                          <label key={option.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-md hover:bg-gray-50 transition-colors">
                            <input
                              type="radio"
                              name={`question_${q.id}`}
                              value={option.id}
                              checked={picks[q.id] === option.id}
                              onChange={(e) => handlePickChange(q.id, e.target.value)}
                              className="w-5 h-5 text-blue-600 flex-shrink-0"
                              required
                            />
                            <span className="text-sm text-gray-700">{option.text}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'over_under' && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600 mb-1">Line: {q.overUnderLine}</p>
                        <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-md hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name={`question_${q.id}`}
                            value="over"
                            checked={picks[q.id] === 'over'}
                            onChange={(e) => handlePickChange(q.id, e.target.value)}
                            className="w-5 h-5 text-blue-600 flex-shrink-0"
                            required
                          />
                          <span className="text-sm text-gray-700">Over {q.overUnderLine}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-md hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name={`question_${q.id}`}
                            value="under"
                            checked={picks[q.id] === 'under'}
                            onChange={(e) => handlePickChange(q.id, e.target.value)}
                            className="w-5 h-5 text-blue-600 flex-shrink-0"
                            required
                          />
                          <span className="text-sm text-gray-700">Under {q.overUnderLine}</span>
                        </label>
                      </div>
                    )}

                    {q.type === 'yes_no' && (
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-md hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name={`question_${q.id}`}
                            value="yes"
                            checked={picks[q.id] === 'yes'}
                            onChange={(e) => handlePickChange(q.id, e.target.value)}
                            className="w-5 h-5 text-blue-600 flex-shrink-0"
                            required
                          />
                          <span className="text-sm text-gray-700">{q.yesNoLabels?.yes || 'Yes'}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-md hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name={`question_${q.id}`}
                            value="no"
                            checked={picks[q.id] === 'no'}
                            onChange={(e) => handlePickChange(q.id, e.target.value)}
                            className="w-5 h-5 text-blue-600 flex-shrink-0"
                            required
                          />
                          <span className="text-sm text-gray-700">{q.yesNoLabels?.no || 'No'}</span>
                        </label>
                      </div>
                    )}

                      {q.type === 'text' && (
                        <div>
                          <input
                            type="text"
                            value={picks[q.id] || ''}
                            onChange={(e) => handlePickChange(q.id, e.target.value)}
                            required
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                            placeholder="Enter your answer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-2 bg-gray-50 border-t">
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || event.isLocked}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-base min-h-[44px]"
                >
                  {submitting ? 'Submitting...' : hasSubmitted ? 'Update Picks' : 'Submit Picks'}
                </button>
              <button
                type="button"
                onClick={() => router.push('/events')}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              </div>
            </div>
          </form>
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

