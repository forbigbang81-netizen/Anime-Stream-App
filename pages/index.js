import React, { useState, useEffect } from 'react';
import Head from 'next/head';

const API = "https://consumet-api-fawn.vercel.app/anime/gogoanime";
const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural"];

export default function App() {
  const [homeData, setHomeData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [view, setView] = useState('home'); 
  const [selected, setSelected] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [activeEp, setActiveEp] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeGenre, setActiveGenre] = useState('All');

  useEffect(() => { 
    fetch(`${API}/top-airing`).then(r => r.json()).then(d => {
      setHomeData(d.results || []);
      setDisplayData(d.results || []);
    }); 
  }, []);

  const selectAnime = async (anime) => {
    setSelected(anime);
    setView('details');
    const r = await fetch(`${API}/info/${anime.id}`);
    const d = await r.json();
    setEpisodes(d.episodes || []);
    if (d.episodes?.[0]) setActiveEp(d.episodes[0]);
  };

  const applyFilters = () => {
    if (activeGenre === 'All') {
      setDisplayData(homeData);
    } else {
      // Note: Full API filtering requires a different endpoint, 
      // this filters the currently loaded top-airing list for now.
      const filtered = homeData.filter(a => a.genres?.includes(activeGenre));
      setDisplayData(filtered.length > 0 ? filtered : homeData);
    }
    setShowFilters(false);
  };

  return (
    <div style={{ backgroundColor: '#121315', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Head><title>AniStream</title></Head>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', alignItems: 'center', borderBottom: '1px solid #222' }}>
        <h2 style={{ color: '#e51e2a', margin: 0, cursor: 'pointer' }} onClick={() => setView('home')}>AniStream</h2>
        <button onClick={() => setShowFilters(true)} style={{ background: '#222', border: 'none', color: 'white', padding: '10px 15px', borderRadius: '10px', cursor: 'pointer' }}>
          Sort & Filter 🔍
        </button>
      </div>

      {/* Filter Modal (Matches your Screenshot) */}
      {showFilters && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#121315', zIndex: 100, padding: '20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
            <span onClick={() => setShowFilters(false)} style={{ fontSize: '24px', marginRight: '15px', cursor: 'pointer' }}>←</span>
            <h2 style={{ margin: 0 }}>Sort & Filter</h2>
          </div>

          <section style={{ marginBottom: '25px' }}>
            <h4 style={{ color: '#888', marginBottom: '15px' }}>Genre</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {['All', ...GENRES].map(g => (
                <button 
                  key={g} 
                  onClick={() => setActiveGenre(g)}
                  style={{ 
                    padding: '10px 20px', borderRadius: '20px', border: '1px solid #333', 
                    background: activeGenre === g ? '#e51e2a' : '#1a1a1a',
                    color: 'white', cursor: 'pointer'
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </section>

          <div style={{ position: 'sticky', bottom: '10px', display: 'flex', gap: '15px', marginTop: '40px' }}>
            <button onClick={() => setActiveGenre('All')} style={{ flex: 1, padding: '15px', borderRadius: '25px', background: '#222', color: 'white', border: 'none', fontWeight: 'bold' }}>Reset</button>
            <button onClick={applyFilters} style={{ flex: 1, padding: '15px', borderRadius: '25px', background: '#e51e2a', color: 'white', border: 'none', fontWeight: 'bold' }}>Apply</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ padding: '20px' }}>
        {view === 'home' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
            {displayData.map(a => (
              <div key={a.id} onClick={() => selectAnime(a)} style={{ cursor: 'pointer' }}>
                <img src={`https://wsrv.nl/?url=${encodeURIComponent(a.image)}&w=300`} style={{ width: '100%', borderRadius: '15px', aspectRatio: '2/3', objectFit: 'cover' }} />
                <p style={{ fontSize: '14px', fontWeight: '600', marginTop: '10px' }}>{a.title}</p>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <button onClick={() => setView('home')} style={{ background: '#222', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', marginBottom: '20px' }}>← Back</button>
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '15px', overflow: 'hidden', border: '1px solid #333' }}>
              <iframe src={`https://vidsrc.to/embed/anime/${selected.id}/${activeEp?.number}`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
            </div>
            <h2 style={{ marginTop: '20px' }}>{selected.title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '10px', marginTop: '20px' }}>
              {episodes.map(e => (
                <button 
                  key={e.id} 
                  onClick={() => setActiveEp(e)}
                  style={{ 
                    padding: '12px 5px', borderRadius: '10px', border: 'none',
                    background: activeEp?.id === e.id ? '#e51e2a' : (e.isFiller ? '#f1c40f' : '#222'),
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
