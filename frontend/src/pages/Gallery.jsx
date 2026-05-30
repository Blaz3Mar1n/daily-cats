import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import CatMedia from '../components/CatMedia';
import styles from './Gallery.module.css';

function CatCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={`skeleton ${styles.gifArea}`} />
      <div className={styles.info}>
        <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 12, width: '50%' }} />
      </div>
    </div>
  );
}

function CatCard({ cat }) {
  return (
    <div className={styles.card}>
      <div className={styles.gifArea} style={{ background: cat.gif_url ? '#f5ece8' : '#FFE5CC' }}>
        <CatMedia url={cat.gif_url} name={cat.name} fallbackSize="3rem" />
        <span className={styles.dayBadge}>Day {cat.day}</span>
        {cat.sender_name && (
          <span className={styles.senderBadge}>{cat.sender_name.split(' ')[0]}</span>
        )}
      </div>
      <div className={styles.info}>
        <div className={styles.name}>{cat.name}</div>
        {cat.title && <div className={styles.title}>{cat.title}</div>}
      </div>
    </div>
  );
}

export default function Gallery() {
  const [cats,    setCats]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [search,  setSearch]  = useState('');
  const [offset,  setOffset]  = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const LIMIT = 50;

  const load = useCallback(async (q, off) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCats(q, off, LIMIT);
      setCats(data.cats);
      setTotal(data.total);
    } catch {
      setError('Could not load cats. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(search, offset); }, [search, offset]);

  function handleSearch(e) {
    setSearch(e.target.value);
    setOffset(0);
  }

  const maxDay = cats.length ? Math.max(...cats.map(c => c.day)) : 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.statsRow}>
        <div className={styles.stat}><strong>{total}</strong>cats archived</div>
        <div className={styles.stat}><strong>{maxDay}</strong>days running</div>
      </div>

      <input
        className={styles.search}
        placeholder="Search cats by name or title..."
        value={search}
        onChange={handleSearch}
      />

      {error && <div className="error-msg">😿 {error}</div>}

      <div className={styles.grid}>
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <CatCardSkeleton key={i} />)
          : cats.map(cat => <CatCard key={cat.id} cat={cat} />)
        }
      </div>

      {!loading && cats.length === 0 && !error && (
        <div className="error-msg">No cats found for "{search}" 😿</div>
      )}

      {!loading && total > LIMIT && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={offset === 0}
            onClick={() => setOffset(o => Math.max(0, o - LIMIT))}>← Previous</button>
          <span className={styles.pageInfo}>{offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
          <button className={styles.pageBtn} disabled={offset + LIMIT >= total}
            onClick={() => setOffset(o => o + LIMIT)}>Next →</button>
        </div>
      )}
    </div>
  );
}
