'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, PropQuestion } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function MarkResultsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [event, setEvent] = useState<Event | null>(null);
  const [questions, setQuestions] = useState<PropQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const adminFlag = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminFlag);
    
    if (!adminFlag) {
      router.push('/admin/login');
    }
  }, [router]);

  useEffect(() => {
    if (!eventId) return;

    // Fetch event details
    const fetchEvent = async () => {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        setEvent({
          id: eventDoc.id,
          ...eventDoc.data(),
          eventDate: eventDoc.data().eventDate?.toDate(),
          createdAt: eventDoc.data().createdAt?.toDate(),
        } as Event);
      }
    };

    fetchEvent();

    // Subscribe to questions
    const q = query(
      collection(db, 'questions'),
      where('eventId', '==', eventId),
      orderBy('order', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const questionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as PropQuestion[];
      setQuestions(questionsData);

      // Initialize answers with existing correct answers
      const initialAnswers: Record<string, string> = {};
      questionsData.forEach(q => {
        if (q.correctAnswer) {
          initialAnswers[q.id] = q.correctAnswer;
        }
      });
      setAnswers(initialAnswers);
    });

    return () => unsubscribe();
  }, [eventId]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSaveResults = async () => {
    setSaving(true);
    try {
      // Update each question with its correct answer
      const updates = Object.entries(answers).map(([questionId, answer]) => 
        updateDoc(doc(db, 'questions', questionId), { correctAnswer: answer })
      );
      
      await Promise.all(updates);
      alert('Results saved successfully! Leaderboard will update automatically.');
      router.push('/admin');
    } catch (err) {
      console.error('Error saving results:', err);
      alert('Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin || !event) {
    return null;
  }

  return (
    <div className="flex-1" style={{ background: 'transparent' }}>
      <Navbar />
      
      <main className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            {event.name?.replace(/Super Bowl 2026/gi, 'Super Bowl LX')} - Mark Results
          </h1>
          <p className="text-sm text-gray-600">
            Enter the correct answers to calculate scores
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
          {questions.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">
              No questions found for this event.
            </div>
          ) : (
            <div className="divide-y">
              {questions.map((q, index) => (
                <div key={q.id} className="px-4 py-2.5">
                  <div className="mb-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                        {q.type.replace('_', ' ').toUpperCase()}
                      </span>
                      {answers[q.id] && (
                        <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                          ✓
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800">
                      {q.question}
                    </h3>
                  </div>

                  <div className="ml-4">
                    {q.type === 'multiple_choice' && q.options && (
                      <div className="space-y-1">
                        {q.options.map(option => (
                          <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`question_${q.id}`}
                              value={option.id}
                              checked={answers[q.id] === option.id}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              className="w-3.5 h-3.5 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">{option.text}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'over_under' && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600 mb-1">Line: {q.overUnderLine}</p>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`question_${q.id}`}
                            value="over"
                            checked={answers[q.id] === 'over'}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                          <span className="text-sm text-gray-700">Over</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`question_${q.id}`}
                            value="under"
                            checked={answers[q.id] === 'under'}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                          <span className="text-sm text-gray-700">Under</span>
                        </label>
                      </div>
                    )}

                    {q.type === 'yes_no' && (
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`question_${q.id}`}
                            value="yes"
                            checked={answers[q.id] === 'yes'}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                          <span className="text-sm text-gray-700">{q.yesNoLabels?.yes || 'Yes'}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`question_${q.id}`}
                            value="no"
                            checked={answers[q.id] === 'no'}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                          <span className="text-sm text-gray-700">{q.yesNoLabels?.no || 'No'}</span>
                        </label>
                      </div>
                    )}

                    {q.type === 'text' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Correct Answer
                        </label>
                        <input
                          type="text"
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-full max-w-md px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                          placeholder="Enter the correct answer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSaveResults}
            disabled={saving || questions.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-sm"
          >
            {saving ? 'Saving...' : 'Save Results'}
          </button>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </main>
    </div>
  );
}

