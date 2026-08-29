import React, { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { HomePage } from './pages/HomePage';
import { useAppStore } from './store/useAppStore';

export const App: React.FC = () => {
  const { setOrigin } = useAppStore();

  // Detect real phone/device GPS location on initial load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setOrigin(
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            'Your Current Location'
          );
        },
        (err) => {
          console.warn('Geolocation initial query notice:', err.message);
          // Fallback to default urban center if permission denied/pending
          setOrigin({ lat: 12.9177, lng: 77.6238 }, 'Your Location');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [setOrigin]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none font-sans">
      <Header />
      <main className="flex-1 relative overflow-hidden">
        <HomePage />
      </main>
    </div>
  );
};

export default App;
