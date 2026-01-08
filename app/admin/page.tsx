'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/lib/types';

export default function AdminPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingDate, setUpdatingDate] = useState<string | null>(null);

  useEffect(() => {
    // Check for admin flag in localStorage
    const adminFlag = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminFlag);
    
    if (!adminFlag) {
      router.push('/admin/login');
    }
  }, [router]);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        eventDate: doc.data().eventDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Event[];
      setEvents(eventsData);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleQuickUpdateDate = async (eventId: string) => {
    if (!confirm('Update event date to 2/5/2026 at 6:30 PM?')) {
      return;
    }
    
    setUpdatingDate(eventId);
    try {
      const newDate = new Date('2026-02-05T18:30:00');
      await updateDoc(doc(db, 'events', eventId), {
        eventDate: newDate
      });
      alert('Event date updated successfully!');
    } catch (err: any) {
      console.error('Error updating date:', err);
      alert(`Failed to update date: ${err.message}`);
    } finally {
      setUpdatingDate(null);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex-1 bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Admin Panel 🔧
          </h1>
          <p className="text-sm text-gray-600">
            Manage events, questions, and results
          </p>
        </div>

        <div className="mb-4">
          <Link
            href="/admin/create-event"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-semibold text-sm"
          >
            + Create New Event
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b">
            <h2 className="text-base font-bold text-gray-800">All Events</h2>
          </div>

          {events.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">
              No events created yet. Create your first event to get started!
            </div>
          ) : (
            <div className="divide-y">
              {events.map((event) => (
                <div key={event.id} className="px-4 py-2 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-800 mb-0.5">
                        {event.name?.replace(/Super Bowl 2026/gi, 'Super Bowl LX')}
                      </h3>
                      <p className="text-xs text-gray-600 mb-1">{event.description}</p>
                      <div className="flex gap-3 text-xs flex-wrap">
                        <span className="text-gray-500">
                          📅 {event.eventDate?.toLocaleDateString()}
                        </span>
                        <span className={`font-medium ${event.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                          {event.isActive ? '✓ Active' : '○ Inactive'}
                        </span>
                        <span className={`font-medium ${event.isLocked ? 'text-red-600' : 'text-blue-600'}`}>
                          {event.isLocked ? '🔒 Locked' : '🔓 Open'}
                        </span>
                        <span className="text-gray-400 font-mono text-xs">
                          ID: {event.id}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleQuickUpdateDate(event.id)}
                        disabled={updatingDate === event.id}
                        className="px-2.5 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-xs disabled:bg-gray-400"
                        title="Quick update date to 2/5/2026 6:30 PM"
                      >
                        {updatingDate === event.id ? 'Updating...' : '📅 Fix'}
                      </button>
                      <Link
                        href={`/admin/event/${event.id}/edit`}
                        className="px-2.5 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-xs"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/admin/event/${event.id}/questions`}
                        className="px-2.5 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-xs"
                      >
                        Questions
                      </Link>
                      <Link
                        href={`/admin/event/${event.id}/results`}
                        className="px-2.5 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                      >
                        Results
                      </Link>
                      <Link
                        href={`/admin/event/${event.id}/submissions`}
                        className="px-2.5 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-xs"
                      >
                        Entries
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

