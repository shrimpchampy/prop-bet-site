'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, PropQuestion, UserSubmission, UserPick } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function ManageSubmissionsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [event, setEvent] = useState<Event | null>(null);
  const [questions, setQuestions] = useState<PropQuestion[]>([]);
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState('');
  const [editingFirstName, setEditingFirstName] = useState('');
  const [editingLastName, setEditingLastName] = useState('');
  const [editingPicks, setEditingPicks] = useState<Record<string, string>>({});
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
      where('eventId', '==', eventId)
    );
    
    const unsubscribeQuestions = onSnapshot(q, (snapshot) => {
      const questionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as PropQuestion[];
      questionsData.sort((a, b) => (a.order || 0) - (b.order || 0));
      setQuestions(questionsData);
    });

    // Subscribe to submissions
    const s = query(
      collection(db, 'submissions'),
      where('eventId', '==', eventId)
    );
    
    const unsubscribeSubmissions = onSnapshot(s, (snapshot) => {
      const submissionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate(),
      })) as UserSubmission[];
      setSubmissions(submissionsData);
    });

    return () => {
      unsubscribeQuestions();
      unsubscribeSubmissions();
    };
  }, [eventId]);

  const startEditing = (submission: UserSubmission) => {
    setEditingId(submission.id);
    setEditingUsername(submission.username || '');
    setEditingFirstName(submission.firstName || '');
    setEditingLastName(submission.lastName || '');
    const picksObj: Record<string, string> = {};
    submission.picks.forEach(pick => {
      picksObj[pick.propId] = pick.answer;
    });
    setEditingPicks(picksObj);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingUsername('');
    setEditingFirstName('');
    setEditingLastName('');
    setEditingPicks({});
  };

  const handleSave = async () => {
    if (!editingId) return;

    setSaving(true);
    try {
      const picksArray: UserPick[] = Object.entries(editingPicks).map(([propId, answer]) => ({
        propId,
        answer,
      }));

      const updateData: any = {
        picks: picksArray,
        username: editingUsername.trim() || '',
        firstName: editingFirstName.trim() || '',
        lastName: editingLastName.trim() || '',
      };

      await updateDoc(doc(db, 'submissions', editingId), updateData);
      alert('Entry updated successfully!');
      cancelEdit();
    } catch (err: any) {
      console.error('Error updating submission:', err);
      alert(`Failed to update entry: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePickChange = (questionId: string, answer: string) => {
    setEditingPicks({ ...editingPicks, [questionId]: answer });
  };

  const formatAnswer = (question: PropQuestion, answer: string): string => {
    if (question.type === 'multiple_choice' && question.options) {
      const option = question.options.find(opt => opt.id === answer);
      return option?.text || answer;
    } else if (question.type === 'yes_no' && question.yesNoLabels) {
      return answer === 'yes' ? question.yesNoLabels.yes : question.yesNoLabels.no;
    } else if (question.type === 'over_under') {
      return answer === 'over' ? `Over ${question.overUnderLine}` : `Under ${question.overUnderLine}`;
    }
    return answer;
  };

  if (!isAdmin || !event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {event.name?.replace(/Super Bowl 2026/gi, 'Super Bowl LX')} - Entries
          </h1>
          <p className="text-gray-600 text-sm">
            View and edit submissions for this event
          </p>
        </div>

        {submissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600">No entries submitted yet for this event.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                Entries ({submissions.length})
              </h2>
            </div>

            <div className="divide-y">
              {submissions.map((submission, index) => {
                const isEditing = editingId === submission.id;
                
                return (
                  <div key={submission.id} className="px-4 py-2">
                    {isEditing ? (
                      <div className="space-y-3 p-3 bg-blue-50 rounded border-2 border-blue-500">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Username *
                          </label>
                          <input
                            type="text"
                            value={editingUsername}
                            onChange={(e) => setEditingUsername(e.target.value)}
                            required
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                            placeholder="Username"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name *
                          </label>
                          <input
                            type="text"
                            value={editingFirstName}
                            onChange={(e) => setEditingFirstName(e.target.value)}
                            required
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                            placeholder="First name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            value={editingLastName}
                            onChange={(e) => setEditingLastName(e.target.value)}
                            required
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                            placeholder="Last name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Answers
                          </label>
                          <div className="space-y-2">
                            {questions.map((question) => (
                              <div key={question.id} className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-800 w-8">#{question.order + 1}</span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 mb-1">{question.question}</p>
                                  {question.type === 'multiple_choice' && question.options ? (
                                    <select
                                      value={editingPicks[question.id] || ''}
                                      onChange={(e) => handlePickChange(question.id, e.target.value)}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                                    >
                                      <option value="">Select...</option>
                                      {question.options.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.text}</option>
                                      ))}
                                    </select>
                                  ) : question.type === 'yes_no' ? (
                                    <div className="flex gap-2">
                                      <label className="flex items-center gap-1 text-sm text-gray-900 font-medium">
                                        <input
                                          type="radio"
                                          name={`edit_${question.id}`}
                                          value="yes"
                                          checked={editingPicks[question.id] === 'yes'}
                                          onChange={(e) => handlePickChange(question.id, e.target.value)}
                                        />
                                        {question.yesNoLabels?.yes || 'Yes'}
                                      </label>
                                      <label className="flex items-center gap-1 text-sm text-gray-900 font-medium">
                                        <input
                                          type="radio"
                                          name={`edit_${question.id}`}
                                          value="no"
                                          checked={editingPicks[question.id] === 'no'}
                                          onChange={(e) => handlePickChange(question.id, e.target.value)}
                                        />
                                        {question.yesNoLabels?.no || 'No'}
                                      </label>
                                    </div>
                                  ) : question.type === 'over_under' ? (
                                    <div className="flex gap-2">
                                      <label className="flex items-center gap-1 text-sm text-gray-900 font-medium">
                                        <input
                                          type="radio"
                                          name={`edit_${question.id}`}
                                          value="over"
                                          checked={editingPicks[question.id] === 'over'}
                                          onChange={(e) => handlePickChange(question.id, e.target.value)}
                                        />
                                        Over {question.overUnderLine}
                                      </label>
                                      <label className="flex items-center gap-1 text-sm text-gray-900 font-medium">
                                        <input
                                          type="radio"
                                          name={`edit_${question.id}`}
                                          value="under"
                                          checked={editingPicks[question.id] === 'under'}
                                          onChange={(e) => handlePickChange(question.id, e.target.value)}
                                        />
                                        Under {question.overUnderLine}
                                      </label>
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={editingPicks[question.id] || ''}
                                      onChange={(e) => handlePickChange(question.id, e.target.value)}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                                    />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm disabled:bg-gray-400"
                          >
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-4 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-500">Entry #{index + 1}</span>
                            {submission.username && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                {submission.username}
                              </span>
                            )}
                            {submission.firstName && submission.lastName && (
                              <span className="text-xs text-gray-600">
                                {submission.firstName} {submission.lastName}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {submission.submittedAt instanceof Date 
                                ? submission.submittedAt.toLocaleString() 
                                : 'Unknown date'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {questions.map((question) => {
                              const pick = submission.picks?.find(p => p.propId === question.id);
                              const answer = pick?.answer || 'Not answered';
                              return (
                                <div key={question.id} className="text-xs">
                                  <span className="font-semibold text-gray-600">#{question.order + 1}:</span>{' '}
                                  <span className="text-gray-800">{formatAnswer(question, answer)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <button
                          onClick={() => startEditing(submission)}
                          disabled={!!editingId}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-xs disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

