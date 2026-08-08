import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export default function SplashScreen({ onFinish, duration = 2000 }: SplashScreenProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Main timer
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onFinish, 300); // Wait for fade out animation
    }, duration);

    // Safety timeout - force finish after 5 seconds no matter what
    const safetyTimer = setTimeout(() => {
      setShow(false);
      onFinish();
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, [duration, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 to-white transition-opacity duration-300 ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        {/* Logo/Favicon - Smaller and elegant */}
        <div className="relative">
          <div className="absolute inset-0 bg-blue-600 opacity-10 blur-2xl rounded-full"></div>
          <img
            src="/favicon.jpg"
            alt="Prime Line Coffee Service"
            className="relative w-20 h-20 object-contain rounded-2xl shadow-xl ring-4 ring-blue-100 animate-scale-up"
            onError={(e) => {
              // Fallback to logo if favicon fails
              e.currentTarget.src = '/logo.png';
            }}
          />
        </div>
        
        {/* Company Name - Elegant typography */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Prime Line</h1>
          <p className="text-sm text-gray-500 font-medium">Coffee and Tea Division</p>
        </div>

        {/* Loading indicator - Minimalist */}
        <div className="mt-2">
          <div className="w-24 h-0.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-loading-bar"></div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-up {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes loading-bar {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-scale-up {
          animation: scale-up 0.6s ease-out;
        }

        .animate-loading-bar {
          animation: loading-bar 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
