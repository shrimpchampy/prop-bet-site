'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/lib/types';
import { autoLockEventIfNeeded } from '@/lib/eventLock';

export const dynamic = 'force-dynamic';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    // Subscribe to active events
    const eventsQuery = query(
      collection(db, 'events'),
      where('isActive', '==', true),
      orderBy('eventDate', 'asc')
    );
    
    const unsubscribe = onSnapshot(eventsQuery, async (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
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
      
      setEvents(eventsData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex-1" style={{ border: 'none', borderBottom: 'none', background: 'transparent' }}>
      <Navbar />
      
      <main className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Active Events 🏆
          </h1>
          <p className="text-sm text-gray-600">
            Submit your picks for upcoming events
          </p>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl mb-2">🎲</div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">No Active Events</h2>
            <p className="text-sm text-gray-600">
              Check back later for new prop bet events!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => {
              const isLocked = event.isLocked;
              
              return (
                <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-bold text-gray-800">
                        {event.name?.replace(/Super Bowl 2026/gi, 'Super Bowl LX')}
                      </h3>
                      {isLocked && (
                        <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                          🔒
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {event.description?.replace(/prop bet pool/gi, '').replace(/Super Bowl 2026/gi, 'Super Bowl LX').trim()}
                    </p>
                    
                    <div className="text-xs text-gray-500 mb-2">
                      📅 {event.eventDate?.toLocaleDateString()} at {event.eventDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    <Link
                      href={`/events/${event.id}`}
                      className={`block w-full text-center px-3 py-1.5 rounded-md transition-colors font-medium text-sm ${
                        isLocked
                          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isLocked ? 'Event Locked' : 'Submit Picks'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
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

