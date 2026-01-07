'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check for admin flag in localStorage (simple client-side check)
    const adminFlag = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminFlag);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('isAdmin');
    setIsAdmin(false);
    router.push('/');
  };

  return (
    <nav 
      className="text-white shadow-lg"
      style={{
        background: 'linear-gradient(to right, #0B162A 0%, #0B162A 75%, #C83803 100%)'
      }}
    >
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex-shrink-0">
              <img
                src="/bear-logo.png"
                alt="Bear Down Bets Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Hide the image if it fails to load
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <span className="text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 900, color: '#C83803', letterSpacing: '-0.02em' }}>
              Bear Down Bets
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
            {isAdmin && (
              <>
                <Link href="/admin" className="text-sm sm:text-base hover:underline font-semibold px-2 py-1 sm:px-0 sm:py-0">
                  Admin
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-xs sm:text-sm opacity-90 hover:opacity-100 px-2 py-1 sm:px-0 sm:py-0"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
