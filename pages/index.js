import React, { useState, useEffect } from 'react';
import Head from 'next/head';

const API = "https://consumet-api-fawn.vercel.app/anime/gogoanime";
const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Shounen"];

export default function App() {
  const [sections, setSections] = useState({ trending: [], topRated: [], airing: [] });
  const [displayData, setDisplayData] = useState([]);
  const [view, setView] = useState('home'); 
  const [selected, setSelected] = useState(null);
  const [info, setInfo] = useState({});
  const [activeEp, setActiveEp] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { 
    // Fetch multiple sections for the professional look
    Promise.all([
      fetch(`${API}/top-airing`).then(r => r.json()),
      fetch(`${API}/recent-episodes`).then(r => r.json())
    ]).then(([top, recent]) => {
      setSections({ trending: top.results || [], airing: recent.results || [] });
      setDisplayData(top.results || []);
    });
  }, []);

  const selectAnime = async (anime) => {
    setSelected(anime);
    setView('details');
    const r = await fetch(`${API}/info/${anime.id}`);
    const d = await r.json();
    setInfo(d);
    if (d.episodes?.[0]) setActiveEp(d.episodes[0]);
  };

  // Helper to "calculate" next episode (Simulated based on typical weekly release)
  const getNextEpTime = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const now = new Date();
    const nextDate = new Date();
    nextDate.setDate(now.getDate() + 7); 
    return `Next Episode: ${days[nextDate.getDay()]} at 10:00 PM`;
  };

  const Card = ({ a }) => (
    <div onClick={() => selectAnime(a)} style={{ cursor: 'pointer', flex: '0 0 auto', width: '160px' }}>
      <img 
        src={`https://wsrv.nl/?url=${encodeURIComponent(a.image)}&w=300`} 
        style={{ width: '100%', borderRadius: '15px', aspectRatio: '2/3', objectFit: 'cover', border: '1px solid #222' }} 
      />
      <p style={{ fontSize: '13px', fontWeight: '600', marginTop: '8px', color: '#eee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</p>
      <div style={{ display: 'flex', gap: '5px', fontSize: '10px' }}>
        <span style={{ color: '#ff1e30' }}>★ {a.rating || '8.1'}</span>
        <span style={{ color: '#888' }}>{a.releaseDate || '2026'}</span>
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#0b0c0e', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Head><title>AniStream</title></Head>

      {/* Header & Categories */}
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
          <h2 style={{ color: '#ff1e30', margin: 0, fontWeight: '800' }} onClick={() => setView('home')}>AniStream</h2>
          <button onClick={() => setShowFilters(true)} style={{ background: '#1c1d21', border: 'none', color: 'white', padding: '10px 15px', borderRadius: '10px' }}>🔍 Search</button>
        </div>

        {view === 'home' && (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', overflowX: 'auto', paddingBottom: '5px' }}>
              {["🔥 Trending", "⭐ Top Rated", "📺 Airing", "💥 Popular"].map((t, i) => (
                <button key={t} style={{ background: i === 0 ? '#ff1e30' : '#1c1d21', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '25px', whiteSpace: 'nowrap', fontWeight: '600' }}>{t}</button>
              ))}
            </div>

            <h3 style={{ marginBottom: '15px' }}>🔥 Trending</h3>
            <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', marginBottom: '30px', paddingBottom: '10px' }}>
              {sections.trending.map(a => <Card key={a.id} a={a} />)}
            </div>

            <h3 style={{ marginBottom: '15px' }}>📺 Just Released</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
              {sections.airing.map(a => (
                <div key={a.id} onClick={() => selectAnime(a)} style={{ cursor: 'pointer', position: 'relative' }}>
                  <img src={`https://wsrv.nl/?url=${encodeURIComponent(a.image)}&w=300`} style={{ width: '100%', borderRadius: '15px', aspectRatio: '2/3', objectFit: 'cover' }} />
                  <span style={{ position: 'absolute', top: '10px', left: '10px', background: '#ff1e30', fontSize: '10px', padding: '3px 8px', borderRadius: '5px', fontWeight: 'bold' }}>LIVE</span>
                  <p style={{ fontSize: '13px', fontWeight: '600', marginTop: '10px' }}>{a.title}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'details' && selected && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <button onClick={() => setView('home')} style={{ background: '#1c1d21', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', marginBottom: '20px' }}>← Back</button>
            
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '20px', overflow: 'hidden', border: '1px solid #333' }}>
              <iframe src={`https://vidsrc.to/embed/anime/${selected.id}/${activeEp?.number}`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
            </div>

            {/* Next Episode Alert */}
            {info.status === "Releasing" && (
              <div style={{ background: 'rgba(255, 30, 48, 0.1)', border: '1px solid #ff1e30', color: '#ff1e30', padding: '15px', borderRadius: '12px', marginTop: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                ⏰ {getNextEpTime()}
              </div>
            )}

            <h2 style={{ marginTop: '20px', marginBottom: '5px' }}>{selected.title}</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>{info.description?.slice(0, 150)}...</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '10px' }}>
              {info.episodes?.map(e => (
                <button 
                  key={e.id} 
                  onClick={() => setActiveEp(e)}
                  style={{ 
                    padding: '15px 5px', borderRadius: '10px', border: 'none',
                    background: activeEp?.id === e.id ? '#ff1e30' : (e.isFiller ? '#f1c40f' : '#1c1d21'),
                    color: e.isFiller && activeEp?.id !== e.id ? '#000' : 'white',
                    fontWeight: 'bold'
                  }}
                >
                  {e.number}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
