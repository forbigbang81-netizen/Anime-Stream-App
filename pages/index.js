import React, { useState, useEffect } from 'react';
import Head from 'next/head';

const API = "https://consumet-api-fawn.vercel.app/anime/gogoanime";

export default function App() {
  const [trending, setTrending] = useState([]);
  const [airing, setAiring] = useState([]);
  const [searchRes, setSearchRes] = useState([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState('home'); 
  const [selected, setSelected] = useState(null);
  const [info, setInfo] = useState({});
  const [activeEp, setActiveEp] = useState(null);

  useEffect(() => { 
    fetch(`${API}/top-airing`).then(r => r.json()).then(d => setTrending(d.results || []));
    fetch(`${API}/recent-episodes`).then(r => r.json()).then(d => setAiring(d.results || []));
  }, []);

  const handleSearch = async (val) => {
    setQuery(val);
    if (val.trim().length > 2) {
      const r = await fetch(`${API}/${val}`);
      const d = await r.json();
      setSearchRes(d.results || []);
    } else {
      setSearchRes([]);
    }
  };

  const selectAnime = async (anime) => {
    setSelected(anime);
    setView('details');
    const r = await fetch(`${API}/info/${anime.id}`);
    const d = await r.json();
    setInfo(d);
    if (d.episodes?.[0]) setActiveEp(d.episodes[0]);
  };

  // The Card Component - Fixed to ensure it renders
  const AnimeCard = ({ a }) => (
    <div onClick={() => selectAnime(a)} style={{ flex: '0 0 auto', width: '140px', cursor: 'pointer' }}>
      <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: '12px', overflow: 'hidden', background: '#1c1d21' }}>
        <img 
          src={a.image} 
          onError={(e) => { e.target.src = `https://wsrv.nl/?url=${encodeURIComponent(a.image)}&w=300`; }}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      </div>
      <p style={{ fontSize: '12px', marginTop: '8px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#0b0c0e', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Head><title>AniStream</title></Head>

      <div style={{ padding: '20px' }}>
        {/* Search Bar - Now fully functional */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <h2 onClick={() => {setView('home'); setQuery("");}} style={{ color: '#ff1e30', margin: 0, cursor: 'pointer' }}>AniStream</h2>
            <input 
                type="text" 
                placeholder="Search for anime..." 
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ flex: 1, background: '#1c1d21', border: 'none', borderRadius: '8px', padding: '10px', color: 'white' }}
            />
        </div>

        {query.length > 2 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px' }}>
                {searchRes.map(a => <AnimeCard key={a.id} a={a} />)}
            </div>
        ) : view === 'home' ? (
          <>
            <h3>🔥 Trending Now</h3>
            <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '20px' }}>
              {trending.map(a => <AnimeCard key={a.id} a={a} />)}
            </div>
            <h3>📺 Just Released</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px' }}>
              {airing.map(a => <AnimeCard key={a.id} a={a} />)}
            </div>
          </>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <button onClick={() => setView('home')} style={{ background: '#1c1d21', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>← Back</button>
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '15px', overflow: 'hidden' }}>
              <iframe src={`https://vidsrc.to/embed/anime/${selected?.id}/${activeEp?.number}`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
            </div>
            <h2>{selected?.title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))', gap: '10px' }}>
              {info.episodes?.map(e => (
                <button key={e.id} onClick={() => setActiveEp(e)} style={{ padding: '10px', background: activeEp?.id === e.id ? '#ff1e30' : '#1c1d21', border: 'none', color: 'white', borderRadius: '5px' }}>{e.number}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
