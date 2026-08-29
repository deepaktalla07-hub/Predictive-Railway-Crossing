import React, { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { HomePage } from './pages/HomePage';
import { useRouteAnalysis } from './hooks/useRouteAnalysis';

export const App: React.FC = () => {
  const { analyze } = useRouteAnalysis();

  // Run initial route analysis once on mount
  useEffect(() => {
    analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
