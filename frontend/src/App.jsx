import { useState } from 'react';
import Gallery     from './pages/Gallery';
import Elo         from './pages/Elo';
import Guess       from './pages/Guess';
import Leaderboard from './pages/Leaderboard';
import './App.css';

const PAGES = [
  { id: 'gallery',     label: '🐱 Gallery'     },
  { id: 'elo',         label: '🏆 ELO Arena'   },
  { id: 'guess',       label: '🕵️ Who Sent It?' },
  { id: 'leaderboard', label: '📊 Leaderboard'  },
];

export default function App() {
  const [page, setPage] = useState('gallery');

  return (
    <div>
      <header className="site-header">
        <div className="header-inner">
          <h1 className="site-title">🐾 Pošalji Mačku</h1>
          <p className="site-sub">Powered By: Mačka Council</p>
        </div>
      </header>

      <nav className="site-nav">
        {PAGES.map(p => (
          <button
            key={p.id}
            className={`nav-btn ${page === p.id ? 'active' : ''}`}
            onClick={() => setPage(p.id)}
          >
            {p.label}
          </button>
        ))}
      </nav>

      <main>
        {page === 'gallery'     && <Gallery />}
        {page === 'elo'         && <Elo />}
        {page === 'guess'       && <Guess />}
        {page === 'leaderboard' && <Leaderboard />}
      </main>
    </div>
  );
}
