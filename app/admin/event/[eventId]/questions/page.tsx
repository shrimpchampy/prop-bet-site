'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, getDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, PropQuestion, PropType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function ManageQuestionsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [event, setEvent] = useState<Event | null>(null);
  const [questions, setQuestions] = useState<PropQuestion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  
  // Form state
  const [question, setQuestion] = useState('');
  const [propType, setPropType] = useState<PropType>('multiple_choice');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [overUnderLine, setOverUnderLine] = useState('');
  const [yesLabel, setYesLabel] = useState('Yes');
  const [noLabel, setNoLabel] = useState('No');
  const [submitting, setSubmitting] = useState(false);

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
    // Fetch without orderBy to avoid index requirement, then sort client-side
    const q = query(
      collection(db, 'questions'),
      where('eventId', '==', eventId)
    );
    
    console.log('Setting up questions listener for eventId:', eventId);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Questions snapshot received:', snapshot.size, 'questions');
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log('Question found:', doc.id, 'eventId:', data.eventId, 'question:', data.question);
      });
      
      const questionsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
        };
      }) as PropQuestion[];
      
      // Sort by order client-side
      questionsData.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('Questions loaded:', questionsData.length, questionsData);
      setQuestions(questionsData);
    }, (error) => {
      console.error('Error loading questions:', error);
      alert(`Error loading questions: ${error.message}. Check console for details.`);
    });

    return () => unsubscribe();
  }, [eventId]);

  const startEditing = (q: PropQuestion) => {
    console.log('Starting to edit question:', q.id, q.question);
    setEditingId(q.id);
    setQuestion(q.question);
    setPropType(q.type);
    
    if (q.type === 'multiple_choice' && q.options) {
      setOptions(q.options.map(opt => opt.text));
    } else {
      setOptions(['', '']);
    }
    
    if (q.type === 'over_under') {
      setOverUnderLine(q.overUnderLine?.toString() || '');
    } else {
      setOverUnderLine('');
    }
    
    if (q.type === 'yes_no' && q.yesNoLabels) {
      setYesLabel(q.yesNoLabels.yes);
      setNoLabel(q.yesNoLabels.no);
    } else {
      setYesLabel('Yes');
      setNoLabel('No');
    }
    
    setSubmitting(false); // Ensure submitting is reset
    setShowForm(true); // Show form first
    
    // Force scroll to top first to ensure form is visible
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Scroll to form after a brief delay to ensure it's rendered
    setTimeout(() => {
      const formElement = document.getElementById('question-form');
      console.log('Form element found:', formElement);
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Highlight it briefly so user can see it
        formElement.style.transition = 'all 0.3s';
        formElement.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)';
        setTimeout(() => {
          formElement.style.boxShadow = '';
        }, 2000);
      } else {
        console.error('Form element not found!');
      }
    }, 300);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setQuestion('');
    setOptions(['', '']);
    setOverUnderLine('');
    setYesLabel('Yes');
    setNoLabel('No');
    setPropType('multiple_choice');
    setShowForm(false);
    setSubmitting(false); // Reset submitting state
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingId) {
        // Update existing question
        console.log('Updating question:', editingId);
        
        const questionData: any = {
          question,
          type: propType,
        };

        if (propType === 'multiple_choice') {
          questionData.options = options
            .filter(opt => opt.trim())
            .map((opt, idx) => ({ id: `opt_${idx}`, text: opt.trim() }));
        } else if (propType === 'over_under') {
          questionData.overUnderLine = parseFloat(overUnderLine);
        } else if (propType === 'yes_no') {
          questionData.yesNoLabels = {
            yes: yesLabel.trim() || 'Yes',
            no: noLabel.trim() || 'No'
          };
        }

        await updateDoc(doc(db, 'questions', editingId), questionData);
        alert('Question updated successfully!');
        cancelEdit();
      } else {
        // Add new question
        console.log('Adding question with eventId:', eventId);
        console.log('Current questions count:', questions.length);
        
        const questionData: any = {
          eventId,
          question,
          type: propType,
          order: questions.length,
          createdAt: new Date(),
        };
      
      console.log('Question data to save:', questionData);

      if (propType === 'multiple_choice') {
        questionData.options = options
          .filter(opt => opt.trim())
          .map((opt, idx) => ({ id: `opt_${idx}`, text: opt.trim() }));
      } else if (propType === 'over_under') {
        questionData.overUnderLine = parseFloat(overUnderLine);
      } else if (propType === 'yes_no') {
        questionData.yesNoLabels = {
          yes: yesLabel.trim() || 'Yes',
          no: noLabel.trim() || 'No'
        };
      }

        const docRef = await addDoc(collection(db, 'questions'), questionData);
        console.log('Question added with ID:', docRef.id);

        // Success message
        alert('Question added successfully!');
        
        // Reset form
        cancelEdit();
      }
    } catch (err: any) {
      console.error('Error adding/updating question:', err);
      alert(`Failed to ${editingId ? 'update' : 'add'} question: ${err.message || 'Unknown error'}`);
      setSubmitting(false);
      // Don't cancel edit on error - let user try again
    }
  };

  const handleMoveQuestion = async (questionId: string, direction: 'up' | 'down') => {
    const currentIndex = questions.findIndex(q => q.id === questionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= questions.length) return; // Can't move beyond bounds

    setMovingId(questionId);
    try {
      const batch = writeBatch(db);
      
      // Get the two questions to swap
      const currentQuestion = questions[currentIndex];
      const targetQuestion = questions[newIndex];
      
      // Swap their order values
      const tempOrder = currentQuestion.order || currentIndex;
      const targetOrder = targetQuestion.order || newIndex;
      
      batch.update(doc(db, 'questions', currentQuestion.id), { order: targetOrder });
      batch.update(doc(db, 'questions', targetQuestion.id), { order: tempOrder });
      
      await batch.commit();
      
      // Optimistically update UI
      const newQuestions = [...questions];
      [newQuestions[currentIndex], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[currentIndex]];
      setQuestions(newQuestions);
    } catch (err) {
      console.error('Error moving question:', err);
      alert('Failed to move question. Please try again.');
    } finally {
      setMovingId(null);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    const questionText = question ? `"${question.question.substring(0, 50)}${question.question.length > 50 ? '...' : ''}"` : 'this question';
    
    if (confirm(`Are you sure you want to delete ${questionText}?\n\nThis action cannot be undone.`)) {
      setDeletingId(questionId);
      try {
        // Delete from Firestore first
        await deleteDoc(doc(db, 'questions', questionId));
        
        // The onSnapshot listener will automatically update the list
        // Questions will maintain their order values, which is fine
        
        // The onSnapshot listener will update the state with the actual server state
        // This just makes the UI feel more responsive
      } catch (err) {
        console.error('Error deleting question:', err);
        alert('Failed to delete question. Please try again.');
        // Refresh the page to get the correct state if deletion failed
        window.location.reload();
      } finally {
        setDeletingId(null);
      }
    }
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
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
            {event.name?.replace(/Super Bowl 2026/gi, 'Super Bowl LX')} - Questions
          </h1>
          <p className="text-gray-600 text-sm">
            Add and manage prop questions for this event
          </p>
        </div>

        <div className="mb-3">
          {!showForm ? (
            <button
              onClick={() => {
                cancelEdit();
                setShowForm(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-semibold text-sm"
            >
              + Add New Question
            </button>
          ) : (
            <div id="question-form" className="bg-white rounded-lg shadow-md p-4 mb-6 border-2 border-blue-500">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  {editingId ? `Edit Question #${questions.findIndex(q => q.id === editingId) + 1}` : 'Add New Question'}
                </h2>
                <button
                  onClick={cancelEdit}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium px-2 py-1"
                >
                  ✕ Cancel
                </button>
              </div>
              
              <form onSubmit={handleAddQuestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Type *
                  </label>
                  <select
                    value={propType}
                    onChange={(e) => setPropType(e.target.value as PropType)}
                    disabled={!!editingId}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="over_under">Over/Under</option>
                    <option value="yes_no">Yes/No</option>
                    <option value="text">Text Entry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question *
                  </label>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="What will be the coin toss result?"
                  />
                </div>

                {propType === 'multiple_choice' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options *
                    </label>
                    {options.map((option, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder={`Option ${index + 1}`}
                        />
                        {options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      + Add Option
                    </button>
                  </div>
                )}

                {propType === 'over_under' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Over/Under Line *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={overUnderLine}
                      onChange={(e) => setOverUnderLine(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="50.5"
                    />
                  </div>
                )}

                {propType === 'yes_no' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Option Label (e.g., "Heads", "Yes", "Win")
                      </label>
                      <input
                        type="text"
                        value={yesLabel}
                        onChange={(e) => setYesLabel(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Yes"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Second Option Label (e.g., "Tails", "No", "Lose")
                      </label>
                      <input
                        type="text"
                        value={noLabel}
                        onChange={(e) => setNoLabel(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="No"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      Example: For a coin toss question, use "Heads" and "Tails"
                    </p>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
                  >
                    {submitting ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Question' : 'Add Question')}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">
              Questions ({questions.length})
            </h2>
            <div className="text-xs text-gray-500 font-mono">
              Event ID: {eventId}
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No questions added yet. Add your first question above!
            </div>
          ) : (
            <div className="divide-y">
              {questions.map((q, index) => (
                <div key={q.id} className="px-4 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                          {q.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-800 mb-1">
                        {q.question}
                      </h3>
                      {q.type === 'multiple_choice' && q.options && (
                        <div className="text-xs text-gray-600">
                          Options: {q.options.map(opt => opt.text).join(', ')}
                        </div>
                      )}
                      {q.type === 'over_under' && (
                        <div className="text-xs text-gray-600">
                          Line: {q.overUnderLine}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMoveQuestion(q.id, 'up')}
                          disabled={submitting || index === 0 || movingId === q.id || deletingId === q.id || !!editingId}
                          className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-xs disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveQuestion(q.id, 'down')}
                          disabled={submitting || index === questions.length - 1 || movingId === q.id || deletingId === q.id || !!editingId}
                          className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-xs disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        onClick={() => startEditing(q)}
                        disabled={submitting || deletingId === q.id || movingId === q.id || (!!editingId && editingId !== q.id)}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-xs disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {editingId === q.id && submitting ? 'Updating...' : editingId === q.id ? 'Editing' : 'Edit'}
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        disabled={submitting || deletingId === q.id || movingId === q.id || !!editingId}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-xs disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {deletingId === q.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={() => router.push('/admin')}
            className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-semibold"
          >
            Done - Back to Admin
          </button>
        </div>
      </main>
    </div>
  );
}

